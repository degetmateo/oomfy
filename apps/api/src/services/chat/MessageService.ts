import { v7 as uuidv7 } from 'uuid';
import { ChatMessage } from '@oomfy/shared';
import { MongoMessageRepository } from '../../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { WebPushService } from '../notifications/WebPushService.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export interface SendMessagePayload {
  content?: string;
  reply_to_id?: string | null;
  gif_url?: string | null;
  media_urls?: string[];
}

export class MessageService {
  private static async requireParticipant(chatId: string, userId: string): Promise<void> {
    if (!(await MongoChatRepository.isParticipant(chatId, userId))) {
      throw new ForbiddenError('No tienes permisos para acceder a este chat.');
    }
  }

  public static async sendMessage(chatId: string, sender: { id: string; username: string; name: string; role?: string }, payload: SendMessagePayload | string): Promise<ChatMessage> {
    await this.requireParticipant(chatId, sender.id);
    const data: SendMessagePayload = typeof payload === 'string' ? { content: payload } : payload;
    const content = data.content?.trim() || '';
    const messageId = uuidv7();
    const senderMember = await MongoMemberRepository.findById(sender.id);
    const senderObj = {
      id: sender.id, username: sender.username, name: senderMember?.name || sender.name || sender.username,
      role: sender.role || senderMember?.role || 'member', icon_url: senderMember?.icon_url || null, banner_url: null,
    };

    let replyTo: any = null;
    if (data.reply_to_id) {
      const original = await MongoMessageRepository.findByIdInChat(data.reply_to_id, chatId);
      if (!original) throw new ForbiddenError('El mensaje citado no pertenece a este chat.');
      replyTo = { id: original.id, content: original.content, sender_username: original.sender?.username || 'usuario', sender_name: original.sender?.name };
    }

    const message = await MongoMessageRepository.insertMessage({
      id: messageId, chat_id: chatId, sender_id: sender.id, sender: senderObj,
      content, reply_to: replyTo, reply_to_id: data.reply_to_id || null, media_urls: data.media_urls || [], gif_url: data.gif_url || null,
    });
    const snippet = content || (data.gif_url ? 'GIF' : data.media_urls?.length ? 'Imagen' : 'Mensaje');
    await MongoChatRepository.updateLastMessage(chatId, { id: messageId, content: snippet, sender_id: sender.id, created_at: (message as any).created_at });
    SocketGateway.broadcastChatMessage(chatId, message);
    for (const p of await MongoChatRepository.getChatParticipants(chatId)) {
      SocketGateway.sendToUser(p, 'new_chat_message', message);
      if (p !== sender.id) {
        WebPushService.sendPushToUser(p, { title: `${sender.name} te envió un mensaje`, body: snippet, url: '/chats' }, 'messages').catch(() => {});
      }
    }
    return message;
  }

  public static async getChatMessages(chatId: string, userId: string, limit = 30, olderId?: string): Promise<any[]> {
    await this.requireParticipant(chatId, userId);
    await MongoMessageRepository.markChatMessagesAsRead(chatId, userId);
    return MongoMessageRepository.listChatMessages(chatId, Math.min(Math.max(1, limit || 30), 50), olderId);
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    return MongoMessageRepository.countUnreadMessages(userId);
  }

  public static async markAsRead(chatId: string, userId: string): Promise<void> {
    await this.requireParticipant(chatId, userId);
    await MongoMessageRepository.markChatMessagesAsRead(chatId, userId);
  }

  public static async deleteMessage(id: string, requesterId: string, requesterRole?: string): Promise<boolean> {
    if (!requesterId) throw new ForbiddenError('Autenticación requerida.');
    const msg = await MongoMessageRepository.findById(id);
    if (!msg) throw new NotFoundError('Mensaje no encontrado.');
    const isOwner = msg.sender_id === requesterId || (msg.sender as any)?.id === requesterId;
    const isStaff = requesterRole === 'admin' || requesterRole === 'mod';
    if (!isOwner && !isStaff) throw new ForbiddenError('No tienes permisos para eliminar este mensaje.');
    const deleted = await MongoMessageRepository.deleteMessage(id);
    if (deleted && msg.chat_id) SocketGateway.broadcastDeleteMessage(msg.chat_id, id);
    return deleted;
  }
}
