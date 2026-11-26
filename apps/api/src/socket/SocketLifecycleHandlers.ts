import { Socket } from 'socket.io';
import { ClientLeavePayload, ClientReturnPayload, ClientSyncPayload, ChatMessage } from '@oomfy/shared';
import { MongoChatRepository } from '../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoNotificationRepository } from '../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoMessageRepository } from '../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { NotificationService } from '../services/notifications/NotificationService.js';
import { SocketGateway } from './SocketGateway.js';

const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const CLOCK_CUSHION_MS = 5_000;
const CHAT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function registerSocketLifecycleHandlers(
  socket: Socket,
  user: { id: string; username: string; sessionId?: string },
  isWithinSocketQuota: (s: Socket) => boolean,
  hasChatAccess: (s: Socket, chatId: string, userId: string) => Promise<boolean>
): void {
  socket.on('client:leave', async (payload?: ClientLeavePayload) => {
    if (!isWithinSocketQuota(socket)) return;
    const now = Date.now();
    socket.data = socket.data || {};
    socket.data.awaySince = now;
    SocketGateway.recordUserLeave(user.id, now);
    const activeChatId = typeof payload?.activeChatId === 'string' ? payload.activeChatId.trim() : '';
    if (activeChatId && CHAT_ID_RE.test(activeChatId) && await hasChatAccess(socket, activeChatId, user.id)) {
      const stopPayload = { chatId: activeChatId, userId: user.id, username: user.username };
      socket.to(`chat:${activeChatId}`).emit('user-stop-typing', stopPayload);
      const participants = await MongoChatRepository.getChatParticipants(activeChatId).catch(() => []);
      for (const p of participants) if (p !== user.id) SocketGateway.sendToUser(p, 'user-stop-typing', stopPayload);
    }
  });

  socket.on('client:return', async (payload?: ClientReturnPayload, ack?: (res: { ok: boolean; serverTime?: number }) => void) => {
    if (!isWithinSocketQuota(socket)) {
      if (typeof ack === 'function') ack({ ok: false });
      return;
    }
    socket.join(`user:${user.id}`);
    if (user.sessionId) socket.join(`session:${user.sessionId}`);

    const rawChats = [
      ...(Array.isArray(payload?.chatIds) ? payload.chatIds : []),
      ...(typeof payload?.activeChatId === 'string' ? [payload.activeChatId] : []),
    ];
    const candidateIds = Array.from(
      new Set(rawChats.filter((c): c is string => typeof c === 'string' && CHAT_ID_RE.test(c.trim())).map((c) => c.trim()))
    ).slice(0, 20);

    const rejoined_chats: string[] = [];
    for (const cid of candidateIds) {
      if (await hasChatAccess(socket, cid, user.id)) {
        socket.join(`chat:${cid}`);
        rejoined_chats.push(cid);
      }
    }

    const activeChatId = typeof payload?.activeChatId === 'string' && rejoined_chats.includes(payload.activeChatId.trim())
      ? payload.activeChatId.trim()
      : null;

    const now = Date.now();
    const serverAway = typeof socket.data?.awaySince === 'number'
      ? (socket.data.awaySince as number)
      : SocketGateway.consumeUserLeave(user.id);
    if (socket.data) delete socket.data.awaySince;

    const clientSince = typeof payload?.since === 'number' && Number.isFinite(payload.since) && payload.since > 0
      ? payload.since
      : null;
    const rawSince = serverAway ?? clientSince ?? (now - 60_000);
    const clampedSince = Math.max(now - MAX_LOOKBACK_MS, Math.min(rawSince, now) - CLOCK_CUSHION_MS);
    const sinceDate = new Date(clampedSince);

    try {
      const [unreadNotifs, unreadMessages, rawMissedNotifs, activeMissedMsgs] = await Promise.all([
        MongoNotificationRepository.countPending(user.id),
        MongoMessageRepository.countUnreadMessages(user.id),
        MongoNotificationRepository.listSince(user.id, sinceDate, 20),
        activeChatId ? MongoMessageRepository.listChatMessagesSince(activeChatId, sinceDate, 50) : Promise.resolve([] as ChatMessage[]),
      ]);
      const missed_notifications = await NotificationService.populateTargetPublications(
        NotificationService.collapseGroupedNotifications(rawMissedNotifs),
        user.id
      );
      const missed_messages: Record<string, ChatMessage[]> = {};
      if (activeChatId && activeMissedMsgs.length > 0) missed_messages[activeChatId] = activeMissedMsgs;

      const syncPayload: ClientSyncPayload = {
        serverTime: now,
        unread_notifications_count: unreadNotifs,
        unread_messages_count: unreadMessages,
        missed_notifications,
        missed_messages,
        rejoined_chats,
      };
      socket.emit('client:sync', syncPayload);
      if (typeof ack === 'function') ack({ ok: true, serverTime: now });
    } catch {
      if (typeof ack === 'function') ack({ ok: false });
    }
  });
}
