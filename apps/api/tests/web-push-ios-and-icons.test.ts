import { describe, it, expect, vi, beforeEach } from 'vitest';
import webpush from 'web-push';
import { WebPushClient } from '../src/infrastructure/adapters/WebPushClient.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { NotificationDispatcher } from '../src/services/notifications/NotificationDispatcher.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { ProfileMediaService } from '../src/services/users/ProfileMediaService.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';

describe('WebPush APNs Headers, Icon Resolution & Expiration Lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formats payload with sender avatar icon or defaults to oomfy logo', () => {
    const withIcon = WebPushClient.formatPayload({
      title: 'Alice', body: 'Hola', icon: 'https://i.ibb.co/avatar.png', url: '/chats', tag: 'chat-1',
    });
    const parsedIcon = JSON.parse(withIcon);
    expect(parsedIcon.icon).toBe('https://i.ibb.co/avatar.png');
    expect(parsedIcon.tag).toBe('chat-1');

    const defaultPayload = WebPushClient.formatPayload({ title: 'System', body: 'Alerta' });
    const parsedDefault = JSON.parse(defaultPayload);
    expect(parsedDefault.icon).toBe('/assets/oomfy-logo-black-bg.png');
    expect(parsedDefault.url).toBe('/notifications');
  });

  it('sends push with APNs headers and 24h TTL for iOS Safari compatibility', async () => {
    const sendSpy = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({ statusCode: 201 } as any);
    const sub = { endpoint: 'https://web.push.apple.com/test-endpoint', keys: { p256dh: 'p256', auth: 'auth' } };

    await WebPushClient.send(sub, JSON.stringify({ title: 'Test' }));
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const options = sendSpy.mock.calls[0][2];
    expect(options?.TTL).toBe(86400);
    expect(options?.urgency).toBe('high');
    expect(options?.headers?.['apns-push-type']).toBe('alert');
    expect(options?.headers?.['apns-priority']).toBe('10');
  });

  it('resolves sender avatar dynamically in NotificationDispatcher and sends push', async () => {
    vi.spyOn(MongoNotificationRepository, 'create').mockResolvedValue(undefined as any);
    vi.spyOn(SocketGateway, 'sendNotification').mockReturnValue(undefined as any);
    vi.spyOn(ProfileMediaService, 'getUserIcon').mockResolvedValue('https://i.ibb.co/sender-pic.jpg');
    const pushSpy = vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(1);

    await NotificationDispatcher.dispatch({
      recipientId: 'recipient-123',
      sender: { id: 'sender-456', username: 'carol', name: 'Carol Danvers', role: 'member' },
      type: 'comment',
      targetPublicationId: 'pub-999',
      push: { title: 'Carol te respondió', body: 'Excelente post!', url: '/publication/pub-999', category: 'replies' },
    });

    expect(pushSpy).toHaveBeenCalledWith('recipient-123', expect.objectContaining({
      title: 'Carol te respondió', icon: 'https://i.ibb.co/sender-pic.jpg', url: '/publication/pub-999', tag: 'notif-comment-sender-456',
    }), 'replies');
  });

  it('falls back to default app logo when user avatar is unavailable in NotificationDispatcher', async () => {
    vi.spyOn(MongoNotificationRepository, 'create').mockResolvedValue(undefined as any);
    vi.spyOn(SocketGateway, 'sendNotification').mockReturnValue(undefined as any);
    vi.spyOn(ProfileMediaService, 'getUserIcon').mockResolvedValue(null);
    const pushSpy = vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(1);

    await NotificationDispatcher.dispatch({
      recipientId: 'recipient-123',
      sender: { id: 'sender-789', username: 'noavatar', name: 'No Avatar User', role: 'member', icon_url: null },
      type: 'comment',
      targetPublicationId: 'pub-100',
      push: { title: 'No Avatar te respondió', body: 'Hola!', url: '/publication/pub-100', category: 'replies' },
    });

    expect(pushSpy).toHaveBeenCalledWith('recipient-123', expect.objectContaining({
      title: 'No Avatar te respondió', icon: '/assets/oomfy-logo-black-bg.png', url: '/publication/pub-100',
    }), 'replies');
  });

  it('marks subscription as expired when gateway returns 400, 403, 404 or 410', async () => {
    vi.spyOn(WebPushClient, 'send').mockRejectedValue({ statusCode: 403, message: 'Forbidden: BadDeviceToken' });
    vi.spyOn(PushSubscriptionRepository, 'findActiveSubscriptions').mockResolvedValue([
      { endpoint: 'https://web.push.apple.com/bad-token', keys: { p256dh: 'p', auth: 'a' } },
    ] as any);
    const markExpiredSpy = vi.spyOn(PushSubscriptionRepository, 'markExpired').mockResolvedValue(undefined);

    const sent = await WebPushService.sendPushToUser('user-test', { title: 'T', body: 'B' });
    expect(sent).toBe(0);
    expect(markExpiredSpy).toHaveBeenCalledWith('https://web.push.apple.com/bad-token');
  });
});
