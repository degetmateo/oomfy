import { ApiClient } from './api.js';

export class PushNotificationService {
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  public static async isSubscribed(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return Boolean(sub);
    } catch {
      return false;
    }
  }

  public static async subscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Tu navegador no soporta notificaciones push.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const keyRes = await ApiClient.get<{ success: boolean; publicKey: string }>(
      '/notifications/vapid-public-key'
    );
    if (!keyRes?.publicKey) {
      throw new Error('No se pudo obtener la clave VAPID del servidor.');
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = this.urlBase64ToUint8Array(keyRes.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
      await ApiClient.post('/notifications/subscribe', {
        endpoint: subJson.endpoint,
        keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
      });
      return true;
    }
    return false;
  }

  public static async unsubscribe(): Promise<void> {
    if (!this.isSupported()) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await ApiClient.post('/notifications/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    } catch {
      // Ignored on teardown
    }
  }

  public static async syncSubscription(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      const subJson = sub.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await ApiClient.post('/notifications/subscribe', {
          endpoint: subJson.endpoint,
          keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
        });
        return true;
      }
    } catch {}
    return false;
  }
}
