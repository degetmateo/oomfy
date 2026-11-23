import { v7 as uuidv7 } from 'uuid';
import { ChatMessage, LIMITS } from '@oomfy/shared';
import { MongoMessageRepository } from '../../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { WebPushService } from '../notifications/WebPushService.js';
import { NotificationIconHelper } from '../notifications/NotificationIconHelper.js';
import { MentionNotificationHelper } from '../publications/MentionNotificationHelper.js';
import { ContentEmbedResolver } from '../publications/ContentEmbedResolver.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../errors/AppError.js';

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
    const participants = await MongoChatRepository.getChatParticipants(chatId);
    for (const p of participants) {
      if (p !== sender.id && (await MongoBlockRepository.isBlockedEitherWay(sender.id, p))) {
        throw new ForbiddenError('No puedes enviar mensajes a este usuario.');
      }
    }
    const data: SendMessagePayload = typeof payload === 'string' ? { content: payload } : payload;
    const content = data.content?.replace(/\r\n?/g, '\n').trim() || '';
    const messageId = uuidv7();
    const senderMember = await MongoMemberRepository.findById(sender.id);
    const senderObj = {
      id: sender.id, username: sender.username, name: senderMember?.name || sender.name || sender.username,
      role: sender.role || senderMember?.role || 'member', icon_url: senderMember?.icon_url || null, banner_url: null,
    };
    if (senderObj.role !== 'admin' && content.length > LIMITS.MESSAGE_CONTENT_MAX) {
      throw new BadRequestError(`El mensaje no puede superar los ${LIMITS.MESSAGE_CONTENT_MAX} caracteres.`);
    }

    let replyTo: any = null;
    if (data.reply_to_id) {
      const original = await MongoMessageRepository.findByIdInChat(data.reply_to_id, chatId);
      if (!original) throw new ForbiddenError('El mensaje citado no pertenece a este chat.');
      replyTo = { id: original.id, content: original.content, sender_username: original.sender?.username || 'usuario', sender_name: original.sender?.name };
    }

    const { embeds, quotedPublication } = await ContentEmbedResolver.resolveForContent(content, {
      userId: sender.id,
      allowQuotePromotion: true,
      throwOnBlockedQuote: false,
      budgetMs: 4500,
    });

    const message = await MongoMessageRepository.insertMessage({
      id: messageId, chat_id: chatId, sender_id: sender.id, sender: senderObj,
      content, reply_to: replyTo, reply_to_id: data.reply_to_id || null,
      media_urls: data.media_urls || [], gif_url: data.gif_url || null,
      embeds, quoted_publication: quotedPublication,
    });
    const snippet = content || (data.gif_url ? 'GIF' : data.media_urls?.length ? 'Imagen' : 'Mensaje');
    await MongoChatRepository.updateLastMessage(chatId, { id: messageId, content: snippet, sender_id: sender.id, created_at: (message as any).created_at });
    SocketGateway.broadcastChatMessage(chatId, message);
    const chatIcon = await NotificationIconHelper.resolveSenderIcon(senderObj);
    for (const p of participants) {
      SocketGateway.sendToUser(p, 'new_chat_message', message);
      if (p !== sender.id) {
        WebPushService.sendPushToUser(p, { title: `${sender.name} te envió un mensaje`, body: snippet, url: '/chats', icon: chatIcon }, 'messages').catch(() => {});
      }
    }
    await MentionNotificationHelper.notifyChatMentions(message, participants, senderObj);
    return message;
  }

  public static async getChatMessages(chatId: string, userId: string, limit = 30, olderId?: string): Promise<any[]> {
    await this.markAsRead(chatId, userId);
    return MongoMessageRepository.listChatMessages(chatId, Math.min(Math.max(1, limit || 30), 50), olderId);
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    return MongoMessageRepository.countUnreadMessages(userId);
  }

  public static async markAsRead(chatId: string, userId: string): Promise<void> {
    await this.requireParticipant(chatId, userId);
    return MongoMessageRepository.markChatMessagesAsRead(chatId, userId);
  }

  public static async deleteMessage(id: string, requesterId: string, requesterRole?: string): Promise<boolean> {
    if (!requesterId) throw new ForbiddenError('Autenticación requerida.');
    const msg = await MongoMessageRepository.findById(id);
    if (!msg) throw new NotFoundError('Mensaje no encontrado.');
    const isOwner = msg.sender_id === requesterId || (msg.sender as any)?.id === requesterId;
    if (!isOwner && requesterRole !== 'admin' && requesterRole !== 'mod') throw new ForbiddenError('No tienes permisos.');
    const deleted = await MongoMessageRepository.deleteMessage(id);
    if (deleted && msg.chat_id) {
      const participants = await MongoChatRepository.getChatParticipants(msg.chat_id).catch(() => []);
      SocketGateway.broadcastDeleteMessage(msg.chat_id, id, participants);
    }
    return deleted;
  }
}
