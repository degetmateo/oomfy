import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { WebPushClient } from '../src/infrastructure/adapters/WebPushClient.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';

describe('Multi-Device Push Subscriptions with Independent Preferences', () => {
  const server = new Server(5018);
  const userId = '019e6d84-f119-7088-8e10-5d287b352b99';
  const userToken = TokenService.generateAccessToken({ id: userId, username: 'multidev_user', email: 'multi@test.com', role: 'member', sessionId: 'sess-multi' });
  const pcEndpoint = `https://fcm.googleapis.com/fcm/send/fake-multi-pc-${Date.now()}`;
  const mobileEndpoint = `https://web.push.apple.com/fake-multi-mobile-${Date.now()}`;
  const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0PwsGCDBeIo63EYE5OgOA5iJViGMW8WUM5P-55W', auth: 'tBHItJI5svbpez7KI4CCXg' };

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-multi-/ } });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async () => ({ rows: [{ id: userId, status: 'active', role: 'member' }] })),
    } as any);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-multi-/ } });
    await MongoDatabase.disconnect();
  });

  it('maintains independent preferences per device and dispatches categories per-device', async () => {
    await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: pcEndpoint, keys });
    await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: mobileEndpoint, keys });

    const activeSubs = await PushSubscriptionRepository.findActiveSubscriptions(userId);
    expect(activeSubs.length).toBe(2);

    // Disable messages on PC only (keep replies enabled)
    await request(server.app).patch('/notifications/preferences').set('Authorization', `Bearer ${userToken}`).send({ endpoint: pcEndpoint, preferences: { messages: false } });

    // Verify PC has messages: false, but Mobile retains messages: true
    const prefPc = await PushSubscriptionRepository.getPreferences(userId, pcEndpoint);
    const prefMobile = await PushSubscriptionRepository.getPreferences(userId, mobileEndpoint);
    expect(prefPc.preferences.messages).toBe(false);
    expect(prefPc.preferences.replies).toBe(true);
    expect(prefMobile.preferences.messages).toBe(true);
    expect(prefMobile.preferences.replies).toBe(true);

    const sendSpy = vi.spyOn(WebPushClient, 'send').mockResolvedValue(undefined as any);

    // Category 'messages': sent ONLY to mobile (1 device)
    const sentMessages = await WebPushService.sendPushToUser(userId, { title: 'DM', body: 'New DM' }, 'messages');
    expect(sentMessages).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    // Category 'replies': sent to BOTH PC and mobile (2 devices)
    sendSpy.mockClear();
    const sentReplies = await WebPushService.sendPushToUser(userId, { title: 'Reply', body: 'New reply' }, 'replies');
    expect(sentReplies).toBe(2);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    // Unsubscribe PC: leaves mobile intact
    await request(server.app).post('/notifications/unsubscribe').send({ endpoint: pcEndpoint });
    const remaining = await PushSubscriptionRepository.findActiveSubscriptions(userId);
    expect(remaining.length).toBe(1);
    expect(remaining[0].endpoint).toBe(mobileEndpoint);

    // Missing endpoint unsubscribe is safe no-op
    await PushSubscriptionRepository.deactivateSubscription(null, userId);
    expect((await PushSubscriptionRepository.findActiveSubscriptions(userId)).length).toBe(1);
  });
});
