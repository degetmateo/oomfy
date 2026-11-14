import { v7 as uuidv7 } from 'uuid';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export class ChatService {
  public static async getOrCreatePrivateChat(requester: { id: string; username: string; name: string }, targetUsername: string) {
    const cleanTarget = targetUsername.trim().toLowerCase();
    const targetUser = await PostgresUserRepository.findByUsername(cleanTarget);
    if (!targetUser || targetUser.status !== 'active') {
      throw new NotFoundError(`El usuario @${cleanTarget} no existe o no está disponible.`);
    }

    if (targetUser.id === requester.id) {
      throw new BadRequestError('No puedes iniciar un chat contigo mismo.');
    }
    if (await MongoBlockRepository.isBlockedEitherWay(requester.id, targetUser.id)) {
      throw new ForbiddenError('No puedes enviar mensajes a este usuario.');
    }

    const existingChatId = await MongoChatRepository.findPrivateChat(requester.id, targetUser.id);
    if (existingChatId) {
      return { id: existingChatId, isNew: false };
    }

    const [reqMember, targetMember] = await Promise.all([
      MongoMemberRepository.findById(requester.id),
      MongoMemberRepository.findById(targetUser.id),
    ]);

    const newChat = await MongoChatRepository.createPrivateChat(
      uuidv7(),
      { id: requester.id, user_id: requester.id, username: requester.username, name: reqMember?.name || requester.name || requester.username, icon_url: reqMember?.icon_url || null },
      { id: targetUser.id, user_id: targetUser.id, username: targetUser.username, name: targetMember?.name || targetUser.name || targetUser.username, icon_url: targetMember?.icon_url || null }
    );

    return { id: newChat.id, isNew: true };
  }

  public static async listUserChats(userId: string) {
    return MongoChatRepository.listUserChats(userId);
  }
}
