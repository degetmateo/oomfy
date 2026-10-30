import { Notification } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';

export class MongoNotificationRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<Notification>('notifications');
  }

  public static async create(notification: Notification): Promise<void> {
    const col = this.getCollection();
    await col.insertOne(notification as any);
  }

  public static async listByRecipient(recipientId: string, limit: number = 20, olderId?: string | null): Promise<Notification[]> {
    const col = this.getCollection();
    const query: any = { recipient_id: recipientId };
    if (olderId) {
      const olderDoc = await col.findOne({ id: olderId });
      if (olderDoc?.created_at) {
        query.created_at = { $lt: olderDoc.created_at };
      }
    }
    return col
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  public static async markAllAsSeen(recipientId: string): Promise<void> {
    const col = this.getCollection();
    await col.updateMany({ recipient_id: recipientId, status: 'pending' }, { $set: { status: 'seen' } });
  }

  public static async countPending(recipientId: string): Promise<number> {
    const col = this.getCollection();
    return col.countDocuments({ recipient_id: recipientId, status: 'pending' });
  }
}

