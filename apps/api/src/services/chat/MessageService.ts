import { v7 as uuidv7 } from 'uuid';
import { ChatMessage, LIMITS, Publication } from '@oomfy/shared';
import { MongoMessageRepository } from '../../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { ChatService } from './ChatService.js';
import { WebPushService } from '../notifications/WebPushService.js';
import { NotificationIconHelper } from '../notifications/NotificationIconHelper.js';
import { MentionNotificationHelper } from '../publications/MentionNotificationHelper.js';
import { ContentEmbedResolver } from '../publications/ContentEmbedResolver.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export interface SendMessagePayload {
  content?: string;
  reply_to_id?: string | null;
  shared_publication_id?: string | null;
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

    let explicitSharedPublication: Publication | null = null;
    if (data.shared_publication_id) {
      const pub = await MongoPublicationRepository.findById(data.shared_publication_id, sender.id);
      if (!pub) throw new NotFoundError('Publicación no encontrada.');
      if (pub.author?.id && pub.author.id !== sender.id && (await MongoBlockRepository.isBlockedEitherWay(sender.id, pub.author.id))) {
        throw new ForbiddenError('No puedes compartir publicaciones de este usuario.');
      }
      const targetPub = pub.type === 'shared' && pub.target_publication ? pub.target_publication : pub;
      explicitSharedPublication = PublicationMapper.stripViewerFlags({
        ...targetPub,
        images: PublicationMapper.sanitizeImages(targetPub.images),
        embeds: PublicationMapper.sanitizeEmbeds(targetPub.embeds),
      });
    }

    const { embeds, quotedPublication: resolvedQuoted } = await ContentEmbedResolver.resolveForContent(content, {
      userId: sender.id,
      allowQuotePromotion: !explicitSharedPublication,
      throwOnBlockedQuote: false,
      budgetMs: 4500,
    });
    const quotedPublication = explicitSharedPublication || resolvedQuoted;

    const message = await MongoMessageRepository.insertMessage({
      id: messageId, chat_id: chatId, sender_id: sender.id, sender: senderObj,
      content, reply_to: replyTo, reply_to_id: data.reply_to_id || null,
      media_urls: data.media_urls || [], gif_url: data.gif_url || null,
      embeds, quoted_publication: quotedPublication,
    });
    const snippet = content || (quotedPublication ? 'Compartió una publicación' : data.gif_url ? 'GIF' : data.media_urls?.length ? 'Imagen' : 'Mensaje');
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

  public static async sharePublicationToRecipients(
    sender: { id: string; username: string; name: string; role?: string },
    input: { publication_id: string; recipient_usernames: string[]; content?: string }
  ): Promise<{
    sent: Array<{ username: string; chatId: string; messageId: string }>;
    failed: Array<{ username: string; reason: string }>;
  }> {
    const pub = await MongoPublicationRepository.findById(input.publication_id, sender.id);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');
    if (pub.author?.id && pub.author.id !== sender.id && (await MongoBlockRepository.isBlockedEitherWay(sender.id, pub.author.id))) {
      throw new ForbiddenError('No puedes compartir publicaciones de este usuario.');
    }

    const recipients = Array.from(
      new Set(input.recipient_usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 20);
    if (recipients.length === 0) throw new BadRequestError('Selecciona al menos un destinatario.');

    const sent: Array<{ username: string; chatId: string; messageId: string }> = [];
    const failed: Array<{ username: string; reason: string }> = [];

    for (const username of recipients) {
      try {
        const chat = await ChatService.getOrCreatePrivateChat(sender, username);
        const msg = await this.sendMessage(chat.id, sender, {
          content: input.content || '',
          shared_publication_id: input.publication_id,
        });
        sent.push({ username, chatId: chat.id, messageId: msg.id });
      } catch (err: any) {
        failed.push({ username, reason: err?.message || 'No se pudo enviar el mensaje.' });
      }
    }

    if (sent.length === 0 && failed.length > 0) {
      throw new BadRequestError(failed[0].reason || 'No se pudo enviar la publicación.');
    }

    return { sent, failed };
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
