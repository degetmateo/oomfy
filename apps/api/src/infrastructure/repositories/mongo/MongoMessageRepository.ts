import { ChatMessage } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

export interface MongoMessageDoc {
  _id: string;
  id: string;
  chat_id: string;
  sender_id: string;
  sender: { id: string; username: string; name: string; icon_url: string | null };
  content: string;
  reply_to?: { id: string; content: string; sender_username: string; sender_name?: string } | null;
  reply_to_id?: string | null;
  media_urls?: string[];
  gif_url?: string | null;
  status: 'sent' | 'seen';
  created_at: string;
  updated_at?: string;
}

export class MongoMessageRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<MongoMessageDoc>('messages');
  }

  public static async insertMessage(data: Partial<MongoMessageDoc>): Promise<ChatMessage> {
    const col = this.getCollection();
    const now = new Date().toISOString();
    const doc: MongoMessageDoc = {
      _id: data.id!,
      id: data.id!,
      chat_id: data.chat_id!,
      sender_id: data.sender_id!,
      sender: data.sender!,
      content: data.content || '',
      reply_to: data.reply_to || null,
      reply_to_id: data.reply_to_id || null,
      media_urls: data.media_urls || [],
      gif_url: data.gif_url || null,
      status: 'sent',
      created_at: now,
      updated_at: now,
    };
    await col.insertOne(doc as any);
    return doc as unknown as ChatMessage;
  }

  public static async findById(id: string): Promise<MongoMessageDoc | null> {
    return this.getCollection().findOne({ id });
  }

  public static async deleteMessage(id: string): Promise<boolean> {
    const res = await this.getCollection().deleteOne({ id });
    return res.deletedCount > 0;
  }

  public static async listChatMessages(
    chatId: string,
    limit: number = 30,
    olderId?: string
  ): Promise<any[]> {
    const col = this.getCollection();
    const query: any = { chat_id: chatId };

    if (olderId) {
      const olderDoc = await col.findOne({ id: olderId });
      if (olderDoc?.created_at) query.created_at = { $lt: olderDoc.created_at };
    }

    const messages = await col.find(query).sort({ created_at: -1 }).limit(limit).toArray();
    return messages.reverse();
  }

  public static async countUnreadMessages(userId: string): Promise<number> {
    const chatsCol = MongoDatabase.getDb().collection('chats');
    const userChats = await chatsCol
      .find({ participant_ids: userId }, { projection: { id: 1 } })
      .toArray();
    if (!userChats.length) return 0;
    const chatIds = userChats.map((c) => c.id);

    return this.getCollection().countDocuments({
      chat_id: { $in: chatIds },
      sender_id: { $ne: userId },
      status: 'sent',
    });
  }

  public static async markChatMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.getCollection().updateMany(
      { chat_id: chatId, sender_id: { $ne: userId }, status: 'sent' },
      { $set: { status: 'seen', updated_at: new Date().toISOString() } }
    );
  }
}

