import { v7 as uuidv7 } from 'uuid';
import { PushPreferences, DEFAULT_PUSH_PREFERENCES } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { ForbiddenError } from '../../../errors/AppError.js';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class PushSubscriptionRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection('push_subscriptions');
  }

  public static async upsertSubscription(userId: string, data: PushSubscriptionData, previousEndpoint?: string | null): Promise<void> {
    if (typeof data?.endpoint !== 'string' || !data.endpoint.trim()) return;
    const col = this.getCollection();
    const now = new Date().toISOString();
    const mongoUid = MongoIdHelper.toMongoId(userId);
    const updateSet = { user_id: mongoUid, endpoint: data.endpoint, keys: data.keys, is_active: true, status: 'active', updated_at: now };

    if (typeof previousEndpoint === 'string' && previousEndpoint.trim() && previousEndpoint !== data.endpoint) {
      const prev = await col.updateOne(this.buildScopedFilter(userId, previousEndpoint), { $set: updateSet });
      if (prev.matchedCount > 0) return;
    }

    const existing = await col.findOne({ endpoint: data.endpoint });
    if (existing && existing.is_active !== false) {
      const sameOwner = MongoIdHelper.idVariants(userId).some((v) => String(v) === String(existing.user_id));
      if (!sameOwner) {
        throw new ForbiddenError('Esta suscripción push ya está registrada en otra cuenta activa.');
      }
    }

    const id = uuidv7();
    await col.updateOne(
      { endpoint: data.endpoint },
      { $set: updateSet, $setOnInsert: { _id: MongoIdHelper.toMongoId(id), id, preferences: { ...DEFAULT_PUSH_PREFERENCES }, created_at: now } },
      { upsert: true }
    );
  }

  private static buildScopedFilter(userId: string, endpoint?: string | null): Record<string, any> {
    const userFilter = { user_id: { $in: MongoIdHelper.idVariants(userId) } };
    return typeof endpoint === 'string' && endpoint.trim().length > 0 ? { ...userFilter, endpoint } : userFilter;
  }

  public static async deactivateSubscription(endpoint?: string | null, userId?: string | null): Promise<void> {
    const safeEndpoint = typeof endpoint === 'string' && endpoint.trim().length > 0 ? endpoint : null;
    const filter = userId ? this.buildScopedFilter(userId, safeEndpoint) : safeEndpoint ? { endpoint: safeEndpoint } : null;
    if (!filter) return;
    await this.getCollection().updateMany(filter, { $set: { is_active: false, status: 'inactive', updated_at: new Date().toISOString() } });
  }

  public static async getPreferences(userId: string, endpoint?: string | null): Promise<{ preferences: PushPreferences; is_active: boolean; status: string }> {
    const doc = await this.getCollection().findOne(this.buildScopedFilter(userId, endpoint));
    return {
      preferences: { ...DEFAULT_PUSH_PREFERENCES, ...(doc?.preferences || {}) },
      is_active: doc?.is_active !== false,
      status: (doc?.status as string) || (doc?.is_active === false ? 'inactive' : 'active'),
    };
  }

  public static async updatePreferences(userId: string, preferences: Partial<PushPreferences>, endpoint?: string | null): Promise<PushPreferences> {
    const setUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(preferences)) {
      if (typeof v === 'boolean') setUpdates[`preferences.${k}`] = v;
    }
    await this.getCollection().updateMany(this.buildScopedFilter(userId, endpoint), { $set: setUpdates });
    return (await this.getPreferences(userId, endpoint)).preferences;
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
    await this.getCollection().updateOne({ endpoint }, { $set: { is_active: false, status: 'expired', updated_at: new Date().toISOString() } });
  }

  public static async deleteByUserId(userId: string): Promise<void> {
    await this.getCollection().deleteMany({ user_id: { $in: MongoIdHelper.idVariants(userId) } });
  }
}
