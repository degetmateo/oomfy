import { v7 as uuidv7 } from 'uuid';
import { ChatMessage } from '@oomfy/shared';
import { MongoMessageRepository } from '../../infrastructure/repositories/mongo/MongoMessageRepository.js';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { WebPushService } from '../notifications/WebPushService.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export interface SendMessagePayload {
  content?: string;
  reply_to_id?: string | null;
  gif_url?: string | null;
  media_urls?: string[];
}

export class MessageService {
  public static async sendMessage(
    chatId: string,
    sender: { id: string; username: string; name: string },
    payload: SendMessagePayload | string
  ): Promise<ChatMessage> {
    const data: SendMessagePayload = typeof payload === 'string' ? { content: payload } : payload;
    const content = data.content?.trim() || '';
    const messageId = uuidv7();
    const senderMember = await MongoMemberRepository.findById(sender.id);
    const senderName = senderMember?.name || sender.name || sender.username;
    const senderIcon = senderMember?.icon_url || `/api/members/${sender.username}/icon`;

    let replyTo: any = null;
    if (data.reply_to_id) {
      const original = await MongoMessageRepository.findById(data.reply_to_id);
      if (original) {
        replyTo = {
          id: original.id,
          content: original.content,
          sender_username: original.sender?.username || 'usuario',
          sender_name: original.sender?.name,
        };
      }
    }

    const senderObj = {
      id: sender.id,
      username: sender.username,
      name: senderName,
      role: (sender as any).role || 'member',
      icon_url: senderIcon,
      banner_url: null,
    };

    const message = await MongoMessageRepository.insertMessage({
      id: messageId,
      chat_id: chatId,
      sender_id: sender.id,
      sender: senderObj,
      content,
      reply_to: replyTo,
      reply_to_id: data.reply_to_id || null,
      media_urls: data.media_urls || [],
      gif_url: data.gif_url || null,
    });

    const snippet = content || (data.gif_url ? 'GIF' : data.media_urls?.length ? 'Imagen' : 'Mensaje');

    await MongoChatRepository.updateLastMessage(chatId, {
      id: messageId,
      content: snippet,
      sender_id: sender.id,
      created_at: (message as any).created_at,
    });

    SocketGateway.broadcastChatMessage(chatId, message);

    const participants = await MongoChatRepository.getChatParticipants(chatId);
    for (const p of participants) {
      SocketGateway.sendToUser(p, 'new_chat_message', message);
      if (p !== sender.id) {
        WebPushService.sendPushToUser(p, {
          title: `Mensaje de @${sender.username}`,
          body: snippet,
          url: '/chats',
        }).catch(() => {});
      }
    }

    return message;
  }

  public static async getChatMessages(
    chatId: string,
    userId: string,
    limit: number = 30,
    olderId?: string
  ): Promise<any[]> {
    await MongoMessageRepository.markChatMessagesAsRead(chatId, userId);
    return MongoMessageRepository.listChatMessages(chatId, limit, olderId);
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    return MongoMessageRepository.countUnreadMessages(userId);
  }

  public static async markAsRead(chatId: string, userId: string): Promise<void> {
    await MongoMessageRepository.markChatMessagesAsRead(chatId, userId);
  }

  public static async deleteMessage(id: string): Promise<boolean> {
    return MongoMessageRepository.deleteMessage(id);
  }
}
