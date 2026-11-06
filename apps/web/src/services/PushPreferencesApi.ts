import type { PushPreferences } from '@oomfy/shared';
import { ApiClient } from './api.js';

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  messages: true, replies: true, quotes: true, upvotes: true, shares: true, follows: true,
};

export class PushPreferencesApi {
  public static async getPreferences(endpoint?: string): Promise<{ preferences: PushPreferences; is_active: boolean; status: string }> {
    const query = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : '';
    const res = await ApiClient.get<any>(`/notifications/preferences${query}`);
    return {
      preferences: res?.preferences || { ...DEFAULT_PUSH_PREFERENCES },
      is_active: res?.is_active ?? true,
      status: res?.status || 'active',
    };
  }

  public static async updatePreferences(preferences: Partial<PushPreferences>, endpoint?: string): Promise<PushPreferences> {
    const res = await ApiClient.patch<any>('/notifications/preferences', { endpoint, preferences });
    return res?.preferences || { ...DEFAULT_PUSH_PREFERENCES };
  }
}
