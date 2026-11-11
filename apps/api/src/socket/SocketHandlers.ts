import { Socket } from 'socket.io';
import { MongoChatRepository } from '../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MessageService } from '../services/chat/MessageService.js';

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
  if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
  userSockets.get(user.id)!.add(socket.id);

  socket.on('join-chat', async (chatId: string) => {
    if (isWithinSocketQuota(socket) && await hasChatAccess(socket, chatId, user.id)) socket.join(`chat:${chatId}`);
  });
  socket.on('typing-start', async (d: { chatId: string }) => {
    if (isWithinSocketQuota(socket) && d?.chatId && await hasChatAccess(socket, d.chatId, user.id)) {
      socket.to(`chat:${d.chatId}`).emit('user-typing', { chatId: d.chatId, userId: user.id, username: user.username });
    }
  });
  socket.on('typing-stop', async (d: { chatId: string }) => {
    if (isWithinSocketQuota(socket) && d?.chatId && await hasChatAccess(socket, d.chatId, user.id)) {
      socket.to(`chat:${d.chatId}`).emit('user-stop-typing', { chatId: d.chatId, userId: user.id, username: user.username });
    }
  });
  socket.on('send-message', async (d: { chatId: string; content: string }) => {
    try {
      if (!isWithinSocketQuota(socket) || typeof d?.chatId !== 'string' || typeof d?.content !== 'string') return;
      const content = d.content.trim();
      if (!content || content.length > 512) return;
      await MessageService.sendMessage(d.chatId, user, content);
    } catch (err) {
      socket.emit('error', { message: (err as Error).message });
    }
  });
  socket.on('disconnect', () => {
    userSockets.get(user.id)?.delete(socket.id);
    if (userSockets.get(user.id)?.size === 0) userSockets.delete(user.id);
  });
}

