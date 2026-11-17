import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationIconHelper } from '../src/services/notifications/NotificationIconHelper.js';
import { ProfileMediaService } from '../src/services/users/ProfileMediaService.js';

describe('NotificationIconHelper (Sender Avatar Resolution & App Logo Fallback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns direct http/https icon if already present on sender', async () => {
    const icon = await NotificationIconHelper.resolveSenderIcon({
      id: 'u1', username: 'alice', icon_url: 'https://i.ibb.co/direct-avatar.png',
    });
    expect(icon).toBe('https://i.ibb.co/direct-avatar.png');
  });

  it('resolves dynamically via ProfileMediaService when icon_url is missing or placeholder', async () => {
    vi.spyOn(ProfileMediaService, 'getUserIcon').mockResolvedValue('https://i.ibb.co/live-avatar.png');
    const icon = await NotificationIconHelper.resolveSenderIcon({
      id: 'u2', username: 'bob', icon_url: '/members/bob/icon',
    });
    expect(icon).toBe('https://i.ibb.co/live-avatar.png');
  });

  it('falls back to default app logo if user has no avatar', async () => {
    vi.spyOn(ProfileMediaService, 'getUserIcon').mockResolvedValue(null);
    const icon = await NotificationIconHelper.resolveSenderIcon({
      id: 'u3', username: 'charlie', icon_url: null,
    });
    expect(icon).toBe('/assets/oomfy-logo-black-bg.png');
  });

  it('returns default app logo for non-user notifications (sender is null or undefined)', async () => {
    const iconNull = await NotificationIconHelper.resolveSenderIcon(null);
    const iconUndefined = await NotificationIconHelper.resolveSenderIcon(undefined);
    expect(iconNull).toBe('/assets/oomfy-logo-black-bg.png');
    expect(iconUndefined).toBe('/assets/oomfy-logo-black-bg.png');
  });
});
