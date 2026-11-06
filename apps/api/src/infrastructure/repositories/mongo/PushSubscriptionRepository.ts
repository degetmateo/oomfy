import { v7 as uuidv7 } from 'uuid';
import { PushPreferences, DEFAULT_PUSH_PREFERENCES } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class PushSubscriptionRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection('push_subscriptions');
  }

  public static async upsertSubscription(userId: string, data: PushSubscriptionData): Promise<void> {
    const col = this.getCollection();
    const id = uuidv7();
    await col.updateOne(
      { endpoint: data.endpoint },
      {
        $set: {
          user_id: MongoIdHelper.toMongoId(userId),
          keys: data.keys,
          is_active: true,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: {
          _id: MongoIdHelper.toMongoId(id),
          id,
          preferences: { ...DEFAULT_PUSH_PREFERENCES },
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }

  public static async deactivateSubscription(endpoint?: string | null, userId?: string | null): Promise<void> {
    const col = this.getCollection();
    const filter = endpoint ? { endpoint } : userId ? { user_id: { $in: MongoIdHelper.idVariants(userId) } } : null;
    if (!filter) return;
    await col.updateMany(filter, {
      $set: { is_active: false, status: 'inactive', updated_at: new Date().toISOString() },
    });
  }

  public static async getPreferences(
    userId: string,
    endpoint?: string | null
  ): Promise<{ preferences: PushPreferences; is_active: boolean }> {
    const col = this.getCollection();
    const filter = endpoint ? { endpoint } : { user_id: { $in: MongoIdHelper.idVariants(userId) } };
    const doc = await col.findOne(filter);
    return {
      preferences: { ...DEFAULT_PUSH_PREFERENCES, ...(doc?.preferences || {}) },
      is_active: doc?.is_active !== false,
    };
  }

  public static async updatePreferences(
    userId: string,
    preferences: Partial<PushPreferences>,
    endpoint?: string | null
  ): Promise<PushPreferences> {
    const col = this.getCollection();
    const filter = endpoint ? { endpoint } : { user_id: { $in: MongoIdHelper.idVariants(userId) } };
    const setUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(preferences)) {
      if (typeof v === 'boolean') setUpdates[`preferences.${k}`] = v;
    }
    await col.updateMany(filter, { $set: setUpdates });
    const updated = await this.getPreferences(userId, endpoint);
    return updated.preferences;
  }

  public static async findActiveSubscriptions(userId: string, category?: keyof PushPreferences): Promise<any[]> {
    const query: any = { user_id: { $in: MongoIdHelper.idVariants(userId) }, is_active: { $ne: false } };
    if (category) query[`preferences.${category}`] = { $ne: false };
    return this.getCollection().find(query).toArray();
  }

  public static async findAllActive(): Promise<any[]> {
    return this.getCollection().find({ is_active: { $ne: false } }).toArray();
  }

  public static async markExpired(endpoint: string): Promise<void> {
    await this.getCollection().updateOne(
      { endpoint },
      { $set: { is_active: false, status: 'expired', updated_at: new Date().toISOString() } }
    );
  }
}
