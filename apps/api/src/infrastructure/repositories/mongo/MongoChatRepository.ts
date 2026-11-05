import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

export interface ChatParticipant {
  id: string;
  user_id: string;
  username: string;
  name: string;
  icon_url: string | null;
}

export interface MongoChatDoc {
  _id: string;
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
    const chat = await col.findOne({
      type: 'private',
      participant_ids: { $all: [userA, userB], $size: 2 },
    });
    return chat?.id || null;
  }

  public static async createPrivateChat(
    chatId: string,
    userA: ChatParticipant,
    userB: ChatParticipant
  ): Promise<MongoChatDoc> {
    const col = this.getCollection();
    const now = new Date().toISOString();
    const doc: MongoChatDoc = {
      _id: chatId,
      id: chatId,
      type: 'private',
      participant_ids: [userA.id, userB.id],
      participants: [userA, userB],
      last_message: null,
      created_at: now,
      updated_at: now,
    };
    await col.insertOne(doc as any);
    return doc;
  }

  public static async listUserChats(userId: string): Promise<MongoChatDoc[]> {
    const col = this.getCollection();
    return col
      .find({ participant_ids: userId })
      .sort({ updated_at: -1 })
      .toArray();
  }

  public static async updateLastMessage(
    chatId: string,
    lastMessage: { id: string; content: string; sender_id: string; created_at: string }
  ): Promise<void> {
    const col = this.getCollection();
    await col.updateOne(
      { id: chatId },
      {
        $set: {
          last_message: lastMessage,
          updated_at: lastMessage.created_at,
        },
      }
    );
  }

  public static async getChatParticipants(chatId: string): Promise<string[]> {
    const col = this.getCollection();
    const chat = await col.findOne({ id: chatId });
    return chat?.participant_ids || [];
  }
}

