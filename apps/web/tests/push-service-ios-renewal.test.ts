import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushNotificationService } from '../src/services/PushNotificationService.js';
import { ApiClient } from '../src/services/api.js';
import { PushPreferencesApi } from '../src/services/PushPreferencesApi.js';

describe('PushNotificationService iOS Expiration & Auto-Renewal', () => {
  let mockPushManager: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPushManager = {
      getSubscription: vi.fn(),
      subscribe: vi.fn(),
    };
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'PushManager', { value: {}, writable: true, configurable: true });
  });

  it('automatically triggers renewSubscription when pushManager subscription is null', async () => {
    mockPushManager.getSubscription.mockResolvedValue(null);
    const renewSpy = vi.spyOn(PushNotificationService, 'renewSubscription').mockResolvedValue(true);

    const ok = await PushNotificationService.syncSubscription();
    expect(ok).toBe(true);
    expect(renewSpy).toHaveBeenCalledTimes(1);
  });

  it('automatically triggers renewSubscription when subscription is marked expired by server', async () => {
    const fakeSub = {
      endpoint: 'https://web.push.apple.com/old-endpoint',
      toJSON: () => ({ endpoint: 'https://web.push.apple.com/old-endpoint', keys: { p256dh: 'p', auth: 'a' } }),
    };
    mockPushManager.getSubscription.mockResolvedValue(fakeSub);
    vi.spyOn(PushPreferencesApi, 'getPreferences').mockResolvedValue({ status: 'expired', is_active: false, preferences: {} as any });
    const renewSpy = vi.spyOn(PushNotificationService, 'renewSubscription').mockResolvedValue(true);

    const ok = await PushNotificationService.syncSubscription();
    expect(ok).toBe(true);
    expect(renewSpy).toHaveBeenCalledTimes(1);
  });

  it('syncs active healthy subscription with backend without unnecessary renewal', async () => {
    const fakeSub = {
      endpoint: 'https://fcm.googleapis.com/valid-endpoint',
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/valid-endpoint', keys: { p256dh: 'p', auth: 'a' } }),
    };
    mockPushManager.getSubscription.mockResolvedValue(fakeSub);
    vi.spyOn(PushPreferencesApi, 'getPreferences').mockResolvedValue({ status: 'active', is_active: true, preferences: {} as any });
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);
    const renewSpy = vi.spyOn(PushNotificationService, 'renewSubscription');

    const ok = await PushNotificationService.syncSubscription();
    expect(ok).toBe(true);
    expect(renewSpy).not.toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledWith('/notifications/subscribe', expect.objectContaining({ endpoint: fakeSub.endpoint }));
  });

  it('provides friendly instructions when attempting to subscribe on iOS without PWA support', async () => {
    Object.defineProperty(window, 'PushManager', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)', writable: true, configurable: true });

    await expect(PushNotificationService.subscribe()).rejects.toThrow(/En iPhone\/iPad, primero agrega oomfy a la pantalla de inicio/i);
  });
});
