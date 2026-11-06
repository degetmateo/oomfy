import webpush from 'web-push';
import { Environment } from '../../config/Environment.js';

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export class WebPushClient {
  private static publicKey = '';
  private static privateKey = '';
  private static isInitialized = false;

  public static ensureInitialized(): void {
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

  public static formatPayload(payload: WebPushPayload): string {
    return JSON.stringify({
      title: payload.title || 'oomfy',
      body: payload.body || '',
      icon: payload.icon || '/assets/logo/oomfy-logo.png',
      url: payload.url || '/notifications',
    });
  }

  public static async send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    dataString: string
  ): Promise<void> {
    this.ensureInitialized();
    await webpush.sendNotification(subscription, dataString);
  }
}

