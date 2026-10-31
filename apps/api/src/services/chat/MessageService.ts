import { v7 as uuidv7 } from 'uuid';
import { ChatMessage } from '@oomfy/shared';
import { PostgresChatRepository } from '../../infrastructure/repositories/postgres/PostgresChatRepository.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class MessageService {
  public static async sendMessage(
    chatId: string,
    sender: { id: string; username: string; name: string },
    content: string
  ): Promise<ChatMessage> {
    const messageId = uuidv7();
    const message = await PostgresChatRepository.insertMessage({
      id: messageId,
      chat_id: chatId,
      sender_id: sender.id,
      content: content.trim(),
    });

    const fullMessage: ChatMessage = {
      ...message,
      sender: {
        id: sender.id,
        username: sender.username,
        name: sender.name,
        role: (sender as any).role || 'member',
        icon_url: (sender as any).icon_url || null,
        banner_url: null,
      },
    };

    SocketGateway.broadcastChatMessage(chatId, fullMessage);

    const participants = await PostgresChatRepository.getChatParticipants(chatId);
    for (const p of participants) {
      if (p !== sender.id) {
        SocketGateway.sendToUser(p, 'new_chat_message', fullMessage);
      }
    }

    return fullMessage;
  }

  public static async getChatMessages(
    chatId: string,
    userId: string,
    limit: number = 30,
    olderId?: string
  ): Promise<any[]> {
    await PostgresChatRepository.markChatMessagesAsRead(chatId, userId);
    return PostgresChatRepository.listChatMessages(chatId, limit, olderId);
  }

  public static async getUnreadCount(userId: string): Promise<number> {
    return PostgresChatRepository.countUnreadMessages(userId);
  }

  public static async markAsRead(chatId: string, userId: string): Promise<void> {
    await PostgresChatRepository.markChatMessagesAsRead(chatId, userId);
  }
}

