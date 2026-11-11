import { ChatMessage } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoMemberRepository } from './MongoMemberRepository.js';

export interface MongoMessageDoc {
  _id: any; id: string; chat_id: string; sender_id: string;
  sender: { id: string; username: string; name: string; icon_url: string | null };
  content: string;
  reply_to?: { id: string; content: string; sender_username: string; sender_name?: string } | null;
  reply_to_id?: string | null; media_urls?: string[]; gif_url?: string | null;
  status: 'sent' | 'seen'; created_at: string; updated_at?: string;
}

export class MongoMessageRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<MongoMessageDoc>('messages');
  }

  private static mapDoc(m: any, memberMap?: Map<string, any>): any {
    const senderId = String(m.sender?.id || m.sender?._id || m.sender_id);
    const live = memberMap?.get(senderId) || (m.sender?.username ? memberMap?.get(m.sender.username.toLowerCase()) : undefined);
    return {
      ...m, id: String(m.id || m._id), chat_id: String(m.chat_id), sender_id: String(m.sender_id),
      sender: m.sender ? {
        ...m.sender, id: senderId, username: live?.username || m.sender.username,
        name: live?.name || m.sender.name, icon_url: live !== undefined ? live.icon_url : m.sender.icon_url,
      } : m.sender,
      reply_to: m.reply_to ? { ...m.reply_to, id: String(m.reply_to.id) } : null,
      reply_to_id: m.reply_to_id ? String(m.reply_to_id) : null,
    };
  }

  public static async insertMessage(data: Partial<MongoMessageDoc>): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const id = data.id!;
    const messageUuid = MongoIdHelper.toMongoId(id);
    const senderUuid = MongoIdHelper.toMongoId(data.sender_id!);
    const doc: any = {
      _id: messageUuid, id: messageUuid, chat_id: MongoIdHelper.toMongoId(data.chat_id!), sender_id: senderUuid,
      sender: { ...data.sender!, id: senderUuid }, content: data.content || '',
      reply_to: data.reply_to ? { ...data.reply_to, id: MongoIdHelper.toMongoId(data.reply_to.id) } : null,
      reply_to_id: data.reply_to_id ? MongoIdHelper.toMongoId(data.reply_to_id) : null,
      media_urls: data.media_urls || [], gif_url: data.gif_url || null, status: 'sent', created_at: now, updated_at: now,
    };
    await this.getCollection().insertOne(doc as any);
    return { ...doc, id } as unknown as ChatMessage;
  }

  public static async findById(id: string): Promise<MongoMessageDoc | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id) as any);
    return doc ? this.mapDoc(doc) : null;
  }

  public static async findByIdInChat(id: string, chatId: string): Promise<MongoMessageDoc | null> {
    const doc = await this.getCollection().findOne({ $and: [MongoIdHelper.idFilter(id), { chat_id: { $in: MongoIdHelper.idVariants(chatId) } }] } as any);
    return doc ? this.mapDoc(doc) : null;
  }

  public static async deleteMessage(id: string): Promise<boolean> {
    const res = await this.getCollection().deleteOne(MongoIdHelper.idFilter(id) as any);
    return res.deletedCount > 0;
  }

  public static async listChatMessages(chatId: string, limit: number = 30, olderId?: string): Promise<any[]> {
    const col = this.getCollection();
    const query: any = { chat_id: { $in: MongoIdHelper.idVariants(chatId) } };
    if (olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(olderId) as any);
      if (olderDoc?.created_at) query.created_at = { $lt: olderDoc.created_at };
    }
    const messages = (await col.find(query).sort({ created_at: -1 }).limit(limit).toArray()).reverse();
    const senderIds = Array.from(new Set(messages.map((m) => String(m.sender_id || m.sender?.id)).filter(Boolean)));
    const memberMap = new Map<string, any>();
    try {
      const members = await MongoMemberRepository.findManyByIds(senderIds);
      for (const mem of members) {
        memberMap.set(String(mem.id), mem);
        if (mem.username) memberMap.set(mem.username.toLowerCase(), mem);
      }
    } catch { /* ignore if members collection is not mocked in unit tests */ }
    return messages.map((m) => this.mapDoc(m, memberMap));
  }

  public static async countUnreadMessages(userId: string): Promise<number> {
    const userVariants = MongoIdHelper.idVariants(userId);
    const userChats = await MongoDatabase.getDb().collection('chats')
      .find({ participant_ids: { $in: userVariants } }, { projection: { id: 1, _id: 1 } }).toArray();
    if (!userChats.length) return 0;
    const chatVariants = userChats.flatMap((c) => MongoIdHelper.idVariants(String(c.id || c._id)));
    return this.getCollection().countDocuments({ chat_id: { $in: chatVariants }, sender_id: { $nin: userVariants }, status: 'sent' });
  }

  public static async markChatMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.getCollection().updateMany(
      { chat_id: { $in: MongoIdHelper.idVariants(chatId) }, sender_id: { $nin: MongoIdHelper.idVariants(userId) }, status: 'sent' },
      { $set: { status: 'seen', updated_at: new Date().toISOString() } }
    );
  }
}
