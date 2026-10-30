import { v7 as uuidv7 } from 'uuid';
import { PostgresChatRepository } from '../../infrastructure/repositories/postgres/PostgresChatRepository.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class ChatService {
  public static async getOrCreatePrivateChat(currentUserId: string, targetUsername: string): Promise<{ chatId: string }> {
    const target = await PostgresUserRepository.findByUsernameOrEmail(targetUsername);
    if (!target) throw new NotFoundError('Usuario destinatario no encontrado.');
    if (target.id === currentUserId) throw new BadRequestError('No puedes crear un chat contigo mismo.');

    let chatId = await PostgresChatRepository.findPrivateChat(currentUserId, target.id);
    if (!chatId) {
      chatId = uuidv7();
      await PostgresChatRepository.createPrivateChat(chatId, currentUserId, target.id);
    }

    return { chatId };
  }

  public static async listUserChats(userId: string): Promise<any[]> {
    return PostgresChatRepository.listUserChats(userId);
  }
}

