import { v7 as uuidv7 } from 'uuid';
import { PushPreferences, DEFAULT_PUSH_PREFERENCES } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { ForbiddenError } from '../../../errors/AppError.js';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PREF_KEYS = new Set([
  'messages', 'replies', 'quotes', 'upvotes', 'shares', 'follows', 'mentions',
  'messages_silent', 'replies_silent', 'quotes_silent', 'upvotes_silent', 'shares_silent', 'follows_silent', 'mentions_silent',
]);

export class PushSubscriptionRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection('push_subscriptions');
  }

  public static async upsertSubscription(userId: string, data: PushSubscriptionData, prevEndpoint?: string | null): Promise<void> {
    if (typeof data?.endpoint !== 'string' || !data.endpoint.trim()) return;
    const col = this.getCollection();
    const now = new Date().toISOString();
    const mongoUid = MongoIdHelper.toMongoId(userId);
    const existing = await col.findOne({ endpoint: data.endpoint });

    if (prevEndpoint && prevEndpoint.trim() && prevEndpoint !== data.endpoint) {
      if (existing) await col.deleteOne(this.buildScopedFilter(userId, prevEndpoint));
      else await col.updateOne(this.buildScopedFilter(userId, prevEndpoint), { $set: { endpoint: data.endpoint, updated_at: now } });
    }

    if (existing && existing.is_active !== false) {
      const sameOwner = MongoIdHelper.idVariants(userId).some((v) => String(v) === String(existing.user_id));
      if (!sameOwner) throw new ForbiddenError('Esta suscripción push ya está registrada en otra cuenta activa.');
    }

    const preferences = existing?.preferences || { ...DEFAULT_PUSH_PREFERENCES };
    const id = uuidv7();
    const updateSet = { user_id: mongoUid, endpoint: data.endpoint, keys: data.keys, is_active: true, status: 'active', preferences, updated_at: now };
    await col.updateOne({ endpoint: data.endpoint }, { $set: updateSet, $setOnInsert: { _id: MongoIdHelper.toMongoId(id), id, created_at: now } }, { upsert: true });
  }

  private static buildScopedFilter(userId: string, endpoint?: string | null): Record<string, any> {
    const userFilter = { user_id: { $in: MongoIdHelper.idVariants(userId) } };
    return endpoint && endpoint.trim().length > 0 ? { ...userFilter, endpoint } : userFilter;
  }

  public static async deactivateSubscription(endpoint?: string | null, userId?: string | null): Promise<void> {
    const safeEndpoint = typeof endpoint === 'string' && endpoint.trim().length > 0 ? endpoint : null;
    if (!safeEndpoint) return;
    const filter = userId ? this.buildScopedFilter(userId, safeEndpoint) : { endpoint: safeEndpoint };
    await this.getCollection().updateMany(filter, { $set: { is_active: false, status: 'inactive', updated_at: new Date().toISOString() } });
  }

  public static async getPreferences(userId: string, endpoint?: string | null): Promise<{ preferences: PushPreferences; is_active: boolean; status: string }> {
    const col = this.getCollection();
    const doc = endpoint && endpoint.trim() ? await col.findOne(this.buildScopedFilter(userId, endpoint)) : await col.findOne({ user_id: { $in: MongoIdHelper.idVariants(userId) }, is_active: { $ne: false } }, { sort: { updated_at: -1 } });
    return {
      preferences: { ...DEFAULT_PUSH_PREFERENCES, ...(doc?.preferences || {}) },
      is_active: doc ? doc.is_active !== false : false,
      status: (doc?.status as string) || (doc?.is_active === false ? 'inactive' : 'inactive'),
    };
  }

  public static async updatePreferences(userId: string, preferences: Partial<PushPreferences>, endpoint?: string | null): Promise<PushPreferences> {
    const setUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(preferences)) {
      if (PREF_KEYS.has(k) && typeof v === 'boolean') setUpdates[`preferences.${k}`] = v;
    }
    const safeEndpoint = typeof endpoint === 'string' && endpoint.trim().length > 0 ? endpoint : null;
    await this.getCollection().updateMany(this.buildScopedFilter(userId, safeEndpoint), { $set: setUpdates });
    return (await this.getPreferences(userId, safeEndpoint)).preferences;
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
