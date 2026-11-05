import { Notification } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoNotificationRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<Notification>('notifications');
  }

  public static async create(notification: Notification): Promise<void> {
    const col = this.getCollection();
    const notifUuid = MongoIdHelper.toMongoId(notification.id);
    const recipientUuid = MongoIdHelper.toMongoId(notification.recipient_id);
    const targetPubUuid = notification.target_publication_id
      ? MongoIdHelper.toMongoId(notification.target_publication_id)
      : null;
    const senderUuid = notification.sender?.id ? MongoIdHelper.toMongoId(notification.sender.id) : null;

    await col.insertOne({
      ...notification,
      _id: notifUuid,
      id: notifUuid,
      recipient_id: recipientUuid,
      target_publication_id: targetPubUuid,
      sender: notification.sender ? {
        ...notification.sender,
        id: senderUuid || notification.sender.id,
      } : notification.sender,
    } as any);
  }

  public static async listByRecipient(recipientId: string, limit: number = 20, olderId?: string | null): Promise<Notification[]> {
    const col = this.getCollection();
    const query: any = { recipient_id: { $in: MongoIdHelper.idVariants(recipientId) } };
    if (olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(olderId) as any);
      if (olderDoc?.created_at) query.created_at = { $lt: olderDoc.created_at };
    }
    const docs = await col.find(query).sort({ created_at: -1 }).limit(limit).toArray();
    return docs.map((doc: any) => ({
      ...doc,
      id: String(doc.id || doc._id),
      recipient_id: String(doc.recipient_id),
      target_publication_id: doc.target_publication_id ? String(doc.target_publication_id) : null,
      sender: doc.sender ? {
        ...doc.sender,
        id: String(doc.sender.id || doc.sender._id),
      } : doc.sender,
    }));
  }

  public static async markAllAsSeen(recipientId: string): Promise<void> {
    const col = this.getCollection();
    await col.updateMany(
      { recipient_id: { $in: MongoIdHelper.idVariants(recipientId) }, status: 'pending' },
      { $set: { status: 'seen' } }
    );
  }

  public static async countPending(recipientId: string): Promise<number> {
    const col = this.getCollection();
    return col.countDocuments({ recipient_id: { $in: MongoIdHelper.idVariants(recipientId) }, status: 'pending' });
  }
}
