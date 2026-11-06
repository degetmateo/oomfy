import type { PushPreferences } from '@oomfy/shared';
import { ApiClient } from './api.js';

export type { PushPreferences };
export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  messages: true, replies: true, quotes: true, upvotes: true, shares: true, follows: true,
};

export class PushNotificationService {
  private static urlBase64ToUint8Array(base64: string): Uint8Array {
    const raw = window.atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }

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
    if (permission !== 'granted') return false;
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
      const appKey = this.urlBase64ToUint8Array(keyRes.publicKey);
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
      if (!sub) return this.renewSubscription();
      const statusRes = await this.getPreferences(sub.endpoint).catch(() => null);
      if (statusRes?.status === 'expired') return this.renewSubscription();
      const json = sub.toJSON();
      if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
        await ApiClient.post('/notifications/subscribe', { endpoint: json.endpoint, keys: json.keys });
        return true;
      }
    } catch {}
    return false;
  }

  public static async getPreferences(endpoint?: string): Promise<{ preferences: PushPreferences; is_active: boolean; status: string }> {
    const query = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : '';
    const res = await ApiClient.get<any>(`/notifications/preferences${query}`);
    return { preferences: res?.preferences || { ...DEFAULT_PUSH_PREFERENCES }, is_active: res?.is_active ?? true, status: res?.status || 'active' };
  }

  public static async updatePreferences(preferences: Partial<PushPreferences>, endpoint?: string): Promise<PushPreferences> {
    const res = await ApiClient.patch<any>('/notifications/preferences', { endpoint, preferences });
    return res?.preferences || { ...DEFAULT_PUSH_PREFERENCES };
  }
}
