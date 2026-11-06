import { PushPreferences } from '@oomfy/shared';
import {
  PushSubscriptionRepository,
  PushSubscriptionData,
} from '../../infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { WebPushClient, WebPushPayload } from '../../infrastructure/adapters/WebPushClient.js';

export { PushSubscriptionData, WebPushPayload };

export class WebPushService {
  public static getPublicKey(): string {
    return WebPushClient.getPublicKey();
  }

  public static async saveSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    await PushSubscriptionRepository.upsertSubscription(userId, subscription);
  }

  public static async deactivateSubscription(endpoint?: string | null, userId?: string | null): Promise<void> {
    await PushSubscriptionRepository.deactivateSubscription(endpoint, userId);
  }

  public static async removeSubscription(userId?: string | null, endpoint?: string | null): Promise<void> {
    await PushSubscriptionRepository.deactivateSubscription(endpoint, userId);
  }

  public static async getPreferences(
    userId: string,
    endpoint?: string | null
  ): Promise<{ preferences: PushPreferences; is_active: boolean }> {
    return PushSubscriptionRepository.getPreferences(userId, endpoint);
  }

  public static async updatePreferences(
    userId: string,
    endpoint: string | null | undefined,
    preferences: Partial<PushPreferences>
  ): Promise<PushPreferences> {
    return PushSubscriptionRepository.updatePreferences(userId, preferences, endpoint);
  }

  public static async sendPushToUser(
    userId: string,
    payload: WebPushPayload,
    category?: keyof PushPreferences
  ): Promise<void> {
    const subs = await PushSubscriptionRepository.findActiveSubscriptions(userId, category);
    if (!subs.length) return;

    const data = WebPushClient.formatPayload(payload);
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await WebPushClient.send({ endpoint: sub.endpoint, keys: sub.keys }, data);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscriptionRepository.markExpired(sub.endpoint);
          }
        }
      })
    );
  }

  public static async broadcastPush(
    payload: WebPushPayload
  ): Promise<{ sent: number; failed: number }> {
    const subs = await PushSubscriptionRepository.findAllActive();
    if (!subs.length) return { sent: 0, failed: 0 };

    const data = WebPushClient.formatPayload(payload);
    let sent = 0;
    let failed = 0;
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await WebPushClient.send({ endpoint: sub.endpoint, keys: sub.keys }, data);
          sent++;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscriptionRepository.markExpired(sub.endpoint);
          }
        }
      })
    );
    return { sent, failed };
  }
}
