import { Socket } from 'socket.io';
import { LIMITS } from '@oomfy/shared';
import { MongoChatRepository } from '../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MessageService } from '../services/chat/MessageService.js';
import { SocketGateway } from './SocketGateway.js';

async function hasChatAccess(socket: Socket, chatId: string, userId: string): Promise<boolean> {
  if (typeof chatId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(chatId)) return false;
  return socket.rooms.has(`chat:${chatId}`) || MongoChatRepository.isParticipant(chatId, userId);
}

function isWithinSocketQuota(socket: Socket): boolean {
  const now = Date.now();
  const state = ((socket as any)._rateLimit || { count: 0, resetAt: now + 10_000 }) as { count: number; resetAt: number };
  if (state.resetAt <= now) { state.count = 0; state.resetAt = now + 10_000; }
  state.count += 1;
  (socket as any)._rateLimit = state;
  return state.count <= 30;
}

export function registerSocketHandlers(socket: Socket, userSockets: Map<string, Set<string>>): void {
  const user = (socket as any).user;
  if (!user) return;
  socket.join(`user:${user.id}`);
  if (user.sessionId) socket.join(`session:${user.sessionId}`);
  const wasOffline = !userSockets.has(user.id) || userSockets.get(user.id)!.size === 0;
  if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
  userSockets.get(user.id)!.add(socket.id);
  if (wasOffline) {
    MongoMemberRepository.findById(user.id)
      .then((member) => {
        if (member) SocketGateway.setUserInvisible(user.id, member.show_online_status === false);
        else SocketGateway.broadcastOnlineMembersUpdated();
      })
      .catch(() => SocketGateway.broadcastOnlineMembersUpdated());
  }

  socket.on('join-chat', async (chatId: string) => {
    if (isWithinSocketQuota(socket) && await hasChatAccess(socket, chatId, user.id)) socket.join(`chat:${chatId}`);
  });
  socket.on('typing-start', async (d: { chatId: string }) => {
    if (isWithinSocketQuota(socket) && d?.chatId && await hasChatAccess(socket, d.chatId, user.id)) {
      const payload = { chatId: d.chatId, userId: user.id, username: user.username };
      socket.to(`chat:${d.chatId}`).emit('user-typing', payload);
      const participants = await MongoChatRepository.getChatParticipants(d.chatId).catch(() => []);
      for (const p of participants) if (p !== user.id) SocketGateway.sendToUser(p, 'user-typing', payload);
    }
  });
  socket.on('typing-stop', async (d: { chatId: string }) => {
    if (isWithinSocketQuota(socket) && d?.chatId && await hasChatAccess(socket, d.chatId, user.id)) {
      const payload = { chatId: d.chatId, userId: user.id, username: user.username };
      socket.to(`chat:${d.chatId}`).emit('user-stop-typing', payload);
      const participants = await MongoChatRepository.getChatParticipants(d.chatId).catch(() => []);
      for (const p of participants) if (p !== user.id) SocketGateway.sendToUser(p, 'user-stop-typing', payload);
    }
  });
  socket.on('send-message', async (d: { chatId: string; content: string }) => {
    try {
      if (!isWithinSocketQuota(socket) || typeof d?.chatId !== 'string' || typeof d?.content !== 'string') return;
      const content = d.content.trim();
      if (!content || (user.role !== 'admin' && content.length > LIMITS.MESSAGE_CONTENT_MAX)) return;
      await MessageService.sendMessage(d.chatId, user, content);
    } catch (err) {
      socket.emit('error', { message: (err as Error).message });
    }
  });
  socket.on('disconnect', () => {
    userSockets.get(user.id)?.delete(socket.id);
    if (userSockets.get(user.id)?.size === 0) {
      userSockets.delete(user.id);
      SocketGateway.broadcastOnlineMembersUpdated();
    }
  });
}

