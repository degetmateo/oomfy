import { describe, it, expect } from 'vitest';

describe('Service Worker Push Notification Icon Resolution', () => {
  function getApiBase(hostname: string) {
    return (hostname !== 'localhost' && hostname !== '127.0.0.1')
      ? 'https://api.oomfy.online' : '';
  }

  function resolveNotificationIcon(rawIcon: string | null | undefined, hostname = 'oomfy.online'): string {
    if (!rawIcon || typeof rawIcon !== 'string') return '/assets/oomfy-logo-black-bg.png';
    const trimmed = rawIcon.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/assets/')) {
      return trimmed;
    }
    if (trimmed.startsWith('/members/') || trimmed.startsWith('/api/')) {
      const apiBase = getApiBase(hostname);
      return apiBase ? `${apiBase}${trimmed}` : '/assets/oomfy-logo-black-bg.png';
    }
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    return '/assets/oomfy-logo-black-bg.png';
  }

  it('preserves external HTTPS avatar URL for user who caused notification', () => {
    const avatar = 'https://i.ibb.co/user-a-avatar.jpg';
    expect(resolveNotificationIcon(avatar)).toBe('https://i.ibb.co/user-a-avatar.jpg');
  });

  it('falls back to default app icon when user has no avatar or icon is empty/null', () => {
    expect(resolveNotificationIcon(null)).toBe('/assets/oomfy-logo-black-bg.png');
    expect(resolveNotificationIcon('')).toBe('/assets/oomfy-logo-black-bg.png');
    expect(resolveNotificationIcon(undefined)).toBe('/assets/oomfy-logo-black-bg.png');
  });

  it('preserves /assets/oomfy-logo-black-bg.png for system / non-user notifications', () => {
    expect(resolveNotificationIcon('/assets/oomfy-logo-black-bg.png')).toBe('/assets/oomfy-logo-black-bg.png');
  });

  it('handles relative paths safely falling back when invalid or without API base', () => {
    expect(resolveNotificationIcon('/members/alice/icon', 'localhost')).toBe('/assets/oomfy-logo-black-bg.png');
    expect(resolveNotificationIcon('/members/alice/icon', 'oomfy.online')).toBe('https://api.oomfy.online/members/alice/icon');
  });
});
