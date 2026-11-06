import type { PushPreferences } from '@oomfy/shared';
import { ApiClient } from './api.js';
import { VapidKeyHelper } from '../utils/VapidKeyHelper.js';
import { PushPreferencesApi, DEFAULT_PUSH_PREFERENCES } from './PushPreferencesApi.js';

export type { PushPreferences };
export { DEFAULT_PUSH_PREFERENCES };

export class PushNotificationService {
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  public static isPermissionGranted(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }
  public static async isSubscribed(): Promise<boolean> {
    if (!this.isPermissionGranted()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(await reg.pushManager.getSubscription());
    } catch { return false; }
  }
  public static async getEndpoint(): Promise<string | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return (await reg.pushManager.getSubscription())?.endpoint || null;
    } catch { return null; }
  }

  public static async subscribe(): Promise<boolean> {
    if (!this.isSupported()) throw new Error('Tu navegador no soporta notificaciones push.');
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? this.renewSubscription() : false;
  }

  public static async reconnect(): Promise<boolean> {
    return this.renewSubscription();
  }

  public static async unsubscribe(): Promise<void> {
    const endpoint = await this.getEndpoint();
    if (endpoint) await ApiClient.post('/notifications/unsubscribe', { endpoint }).catch(() => {});
  }

  public static async renewSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const oldSub = await reg.pushManager.getSubscription();
      const oldEndpoint = oldSub?.endpoint || null;
      if (oldSub) await oldSub.unsubscribe().catch(() => {});
      const keyRes = await ApiClient.get<{ success: boolean; publicKey: string }>('/notifications/vapid-public-key');
      if (!keyRes?.publicKey) return false;
      const appKey = VapidKeyHelper.toUint8Array(keyRes.publicKey);
      const newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey as unknown as BufferSource });
      const json = newSub.toJSON();
      if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
        await ApiClient.post('/notifications/subscribe', { endpoint: json.endpoint, keys: json.keys, previous_endpoint: oldEndpoint });
        return true;
      }
    } catch {}
    return false;
  }

  public static async syncSubscription(): Promise<boolean> {
    if (!this.isPermissionGranted()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      const json = sub.toJSON();
      if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
        await ApiClient.post('/notifications/subscribe', { endpoint: json.endpoint, keys: json.keys });
        return true;
      }
    } catch {}
    return false;
  }

  public static async checkSubscriptionHealth(): Promise<{ healthy: boolean; needsReconnect: boolean }> {
    if (!this.isPermissionGranted()) return { healthy: false, needsReconnect: false };
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return { healthy: false, needsReconnect: true };
      const statusRes = await PushPreferencesApi.getPreferences(sub.endpoint).catch(() => null);
      if (statusRes?.status === 'expired') return { healthy: false, needsReconnect: true };
      await this.syncSubscription();
      return { healthy: true, needsReconnect: false };
    } catch { return { healthy: false, needsReconnect: false }; }
  }

  public static getPreferences = PushPreferencesApi.getPreferences.bind(PushPreferencesApi);
  public static updatePreferences = PushPreferencesApi.updatePreferences.bind(PushPreferencesApi);
}
