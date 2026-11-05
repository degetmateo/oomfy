import webpush from 'web-push';
import { v7 as uuidv7 } from 'uuid';
import { Environment } from '../../config/Environment.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class WebPushService {
  private static publicKey: string = '';
  private static privateKey: string = '';
  private static isInitialized = false;

  private static ensureInitialized(): void {
    if (this.isInitialized) return;

    if (Environment.VAPID_PUBLIC_KEY && Environment.VAPID_PRIVATE_KEY) {
      this.publicKey = Environment.VAPID_PUBLIC_KEY;
      this.privateKey = Environment.VAPID_PRIVATE_KEY;
    } else {
      const vapidKeys = webpush.generateVAPIDKeys();
      this.publicKey = vapidKeys.publicKey;
      this.privateKey = vapidKeys.privateKey;
    }

    webpush.setVapidDetails(
      Environment.VAPID_SUBJECT,
      this.publicKey,
      this.privateKey
    );
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
          user_id: userId,
          keys: subscription.keys,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: {
          _id: id as any,
          id,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }

  public static async removeSubscription(userId: string, endpoint: string): Promise<void> {
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    await col.deleteOne({ user_id: userId, endpoint });
  }

  public static async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; icon?: string; url?: string }
  ): Promise<void> {
    this.ensureInitialized();
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    const subscriptions = await col.find({ user_id: userId }).toArray();

    if (!subscriptions || subscriptions.length === 0) return;

    const data = JSON.stringify({
      title: payload.title || 'oomfy',
      body: payload.body,
      icon: payload.icon || '/assets/logo/oomfy-logo.png',
      url: payload.url || '/notifications',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          data
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await col.deleteOne({ endpoint: sub.endpoint });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }
}

