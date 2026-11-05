import { v7 as uuidv7 } from 'uuid';
import { MongoChatRepository } from '../../infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class ChatService {
  public static async getOrCreatePrivateChat(
    currentUserId: string,
    targetUsername: string
  ): Promise<{ chatId: string }> {
    let target = await MongoMemberRepository.findByUsername(targetUsername);
    let targetId = target?.id;
    let targetName = target?.name || targetUsername;
    let targetIcon = target?.icon_url || `/api/members/${targetUsername}/icon`;

    if (!target) {
      const pgTarget = await PostgresUserRepository.findByUsernameOrEmail(targetUsername);
      if (!pgTarget) throw new NotFoundError('Usuario destinatario no encontrado.');
      targetId = pgTarget.id;
      targetName = pgTarget.name || pgTarget.username;
      targetIcon = `/api/members/${pgTarget.username}/icon`;
    }

    if (targetId === currentUserId) {
      throw new BadRequestError('No puedes crear un chat contigo mismo.');
    }

    let chatId = await MongoChatRepository.findPrivateChat(currentUserId, targetId!);
    if (!chatId) {
      chatId = uuidv7();
      const currentUserMember = await MongoMemberRepository.findById(currentUserId);
      const userA = {
        id: currentUserId,
        user_id: currentUserId,
        username: currentUserMember?.username || 'user',
        name: currentUserMember?.name || 'Usuario',
        icon_url:
          currentUserMember?.icon_url ||
          `/api/members/${currentUserMember?.username || currentUserId}/icon`,
      };
      const userB = {
        id: targetId!,
        user_id: targetId!,
        username: target?.username || targetUsername,
        name: targetName,
        icon_url: targetIcon,
      };
      await MongoChatRepository.createPrivateChat(chatId, userA, userB);
    }

    return { chatId };
  }

  public static async listUserChats(userId: string): Promise<any[]> {
    const chats = await MongoChatRepository.listUserChats(userId);
    if (!chats.length) return [];

    const chatIds = chats.map((c) => c.id);
    const unreadAgg = await MongoDatabase.getDb()
      .collection('messages')
      .aggregate([
        { $match: { chat_id: { $in: chatIds }, sender_id: { $ne: userId }, status: 'sent' } },
        { $group: { _id: '$chat_id', count: { $sum: 1 } } },
      ])
      .toArray();

    const unreadMap = new Map<string, number>();
    for (const item of unreadAgg) {
      unreadMap.set(String(item._id), Number(item.count) || 0);
    }

    return chats.map((c) => ({
      ...c,
      unread_count: unreadMap.get(c.id) || 0,
    }));
  }
}
