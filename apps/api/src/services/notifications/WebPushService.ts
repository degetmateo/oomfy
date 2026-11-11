import { PushPreferences } from '@oomfy/shared';
import { PushSubscriptionRepository, PushSubscriptionData } from '../../infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { WebPushClient, WebPushPayload } from '../../infrastructure/adapters/WebPushClient.js';
import { isSafePublicHttpUrl } from '../../utils/UrlSecurityHelper.js';
import { BadRequestError } from '../../errors/AppError.js';

export class WebPushService {
  public static getPublicKey(): string {
    return WebPushClient.getPublicKey();
  }

  public static async saveSubscription(userId: string, data: PushSubscriptionData, previousEndpoint?: string | null): Promise<void> {
    const parsed = await isSafePublicHttpUrl(data.endpoint);
    if (!parsed || parsed.protocol !== 'https:') {
      throw new BadRequestError('El endpoint de notificación push no es seguro o es inválido.');
    }
    await PushSubscriptionRepository.upsertSubscription(userId, data, previousEndpoint);
  }

  public static async deactivateSubscription(endpoint?: string | null, userId?: string | null): Promise<void> {
    await PushSubscriptionRepository.deactivateSubscription(endpoint, userId);
  }

  public static getPreferences(userId: string, endpoint?: string | null) {
    return PushSubscriptionRepository.getPreferences(userId, endpoint);
  }

  public static updatePreferences(userId: string, endpoint: string | null | undefined, preferences: Partial<PushPreferences>) {
    return PushSubscriptionRepository.updatePreferences(userId, preferences, endpoint);
  }

  public static async sendPushToUser(userId: string, payload: WebPushPayload, category?: keyof PushPreferences): Promise<number> {
    const subs = await PushSubscriptionRepository.findActiveSubscriptions(userId, category);
    const { sent } = await this.dispatchToSubscriptions(subs, WebPushClient.formatPayload(payload));
    return sent;
  }

  public static async broadcastPush(payload: WebPushPayload): Promise<{ sent: number; failed: number }> {
    const subs = await PushSubscriptionRepository.findAllActive();
    return this.dispatchToSubscriptions(subs, WebPushClient.formatPayload(payload));
  }

  private static async dispatchToSubscriptions(subs: any[], dataString: string): Promise<{ sent: number; failed: number }> {
    if (!subs.length) return { sent: 0, failed: 0 };
    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await WebPushClient.send({ endpoint: sub.endpoint, keys: sub.keys }, dataString);
          sent++;
        } catch (err: any) {
          failed++;
          if (err?.statusCode === 404 || err?.statusCode === 410) await PushSubscriptionRepository.markExpired(sub.endpoint);
        }
      })
    );
    return { sent, failed };
  }
}
