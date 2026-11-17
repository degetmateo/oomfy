import webpush from 'web-push';
import { Environment } from '../../config/Environment.js';

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  tag?: string;
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
    const rawIcon = typeof payload.icon === 'string' ? payload.icon.trim() : '';
    const isExternal = /^(https?:\/\/|data:)/i.test(rawIcon);
    const isAppAsset = rawIcon.startsWith('/assets/');
    const safeIcon = isExternal || isAppAsset ? rawIcon : '/assets/oomfy-logo-black-bg.png';

    return JSON.stringify({
      title: payload.title || 'oomfy',
      body: payload.body || '',
      icon: safeIcon,
      image: payload.image || undefined,
      url: payload.url || '/notifications',
      tag: payload.tag || undefined,
    });
  }

  public static async send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    dataString: string
  ): Promise<void> {
    this.ensureInitialized();
    let isApns = false;
    try {
      const parsed = new URL(subscription.endpoint);
      isApns = parsed.hostname.endsWith('.apple.com') || parsed.hostname === 'apple.com';
    } catch {}
    await webpush.sendNotification(subscription, dataString, {
      TTL: 86400,
      urgency: 'high',
      ...(isApns ? { headers: { 'apns-push-type': 'alert', 'apns-priority': '10' } } : {}),
    });
  }
}
