import webpush from 'web-push';
import { v7 as uuidv7 } from 'uuid';
import { Environment } from '../../config/Environment.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class WebPushService {
  private static publicKey = '';
  private static privateKey = '';
  private static isInitialized = false;

  private static ensureInitialized(): void {
    if (this.isInitialized) return;
    if (Environment.VAPID_PUBLIC_KEY && Environment.VAPID_PRIVATE_KEY) {
      this.publicKey = Environment.VAPID_PUBLIC_KEY;
      this.privateKey = Environment.VAPID_PRIVATE_KEY;
    } else {
      const keys = webpush.generateVAPIDKeys();
      this.publicKey = keys.publicKey;
      this.privateKey = keys.privateKey;
    }
    webpush.setVapidDetails(Environment.VAPID_SUBJECT, this.publicKey, this.privateKey);
    this.isInitialized = true;
  }

  public static getPublicKey(): string {
    this.ensureInitialized();
    return this.publicKey;
  }

  public static async saveSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    const id = uuidv7();
    await col.updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user_id: MongoIdHelper.toMongoId(userId),
          keys: subscription.keys,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: { _id: MongoIdHelper.toMongoId(id), id, created_at: new Date().toISOString() },
      },
      { upsert: true }
    );
  }

  public static async removeSubscription(userId?: string | null, endpoint?: string | null): Promise<void> {
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    if (endpoint) await col.deleteMany({ endpoint });
    else if (userId) await col.deleteMany({ user_id: { $in: MongoIdHelper.idVariants(userId) } });
  }

  private static formatData(p: { title: string; body?: string; icon?: string; url?: string }): string {
    return JSON.stringify({
      title: p.title || 'oomfy',
      body: p.body || '',
      icon: p.icon || '/assets/logo/oomfy-logo.png',
      url: p.url || '/notifications',
    });
  }

  public static async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; icon?: string; url?: string }
  ): Promise<void> {
    this.ensureInitialized();
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    const subs = await col.find({ user_id: { $in: MongoIdHelper.idVariants(userId) } }).toArray();
    if (!subs.length) return;

    const data = this.formatData(payload);
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, data);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) await col.deleteOne({ endpoint: sub.endpoint });
        }
      })
    );
  }

  public static async broadcastPush(
    payload: { title: string; body: string; icon?: string; url?: string }
  ): Promise<{ sent: number; failed: number }> {
    this.ensureInitialized();
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    const subs = await col.find({}).toArray();
    if (!subs.length) return { sent: 0, failed: 0 };

    const data = this.formatData(payload);
    let sent = 0;
    let failed = 0;
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, data);
          sent++;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) await col.deleteOne({ endpoint: sub.endpoint });
        }
      })
    );
    return { sent, failed };
  }
}
