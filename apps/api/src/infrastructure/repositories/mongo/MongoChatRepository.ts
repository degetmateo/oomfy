import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export interface ChatParticipant {
  id: string;
  user_id: string;
  username: string;
  name: string;
  icon_url: string | null;
}

export interface MongoChatDoc {
  _id: any;
  id: string;
  type: 'private' | 'group';
  participant_ids: string[];
  participants: ChatParticipant[];
  last_message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export class MongoChatRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<MongoChatDoc>('chats');
  }

  public static async findPrivateChat(userA: string, userB: string): Promise<string | null> {
    const col = this.getCollection();
    const userAVariants = MongoIdHelper.idVariants(userA);
    const userBVariants = MongoIdHelper.idVariants(userB);
    const chat = await col.findOne({
      type: 'private',
      $and: [
        { participant_ids: { $in: userAVariants } },
        { participant_ids: { $in: userBVariants } },
      ],
      participant_ids: { $size: 2 },
    });
    return chat ? String(chat.id || chat._id) : null;
  }

  public static async createPrivateChat(
    chatId: string,
    userA: ChatParticipant,
    userB: ChatParticipant
  ): Promise<MongoChatDoc> {
    const col = this.getCollection();
    const now = new Date().toISOString();
    const chatUuid = MongoIdHelper.toMongoId(chatId);
    const userAUuid = MongoIdHelper.toMongoId(userA.id);
    const userBUuid = MongoIdHelper.toMongoId(userB.id);

    const doc: any = {
      _id: chatUuid,
      id: chatId,
      type: 'private',
      participant_ids: [userAUuid, userBUuid],
      participants: [
        { ...userA, id: userA.id, user_id: userAUuid },
        { ...userB, id: userB.id, user_id: userBUuid },
      ],
      last_message: null,
      created_at: now,
      updated_at: now,
    };
    await col.insertOne(doc as any);
    return { ...doc, id: chatId };
  }

  public static async listUserChats(userId: string): Promise<MongoChatDoc[]> {
    const col = this.getCollection();
    const userVariants = MongoIdHelper.idVariants(userId);
    const docs = await col
      .find({ participant_ids: { $in: userVariants } })
      .sort({ updated_at: -1 })
      .toArray();
    return docs.map((d: any) => ({
      ...d,
      id: String(d.id || d._id),
      participant_ids: (d.participant_ids || []).map((p: any) => String(p)),
      participants: (d.participants || []).map((p: any) => ({
        ...p,
        id: String(p.id || p.user_id),
        user_id: String(p.user_id || p.id),
      })),
      last_message: d.last_message ? {
        ...d.last_message,
        id: String(d.last_message.id),
        sender_id: String(d.last_message.sender_id),
      } : null,
    }));
  }

  public static async updateLastMessage(
    chatId: string,
    lastMessage: { id: string; content: string; sender_id: string; created_at: string }
  ): Promise<void> {
    const col = this.getCollection();
    const lastMsgDoc = {
      ...lastMessage,
      id: MongoIdHelper.toMongoId(lastMessage.id),
      sender_id: MongoIdHelper.toMongoId(lastMessage.sender_id),
    };
    await col.updateOne(
      MongoIdHelper.idFilter(chatId) as any,
      {
        $set: {
          last_message: lastMsgDoc,
          updated_at: lastMessage.created_at,
        },
      }
    );
  }

  public static async getChatParticipants(chatId: string): Promise<string[]> {
    const col = this.getCollection();
    const chat = await col.findOne(MongoIdHelper.idFilter(chatId) as any);
    return (chat?.participant_ids || []).map((id: any) => String(id));
  }
}
