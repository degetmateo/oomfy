import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { WebPushClient } from '../src/infrastructure/adapters/WebPushClient.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';

describe('Multi-Device Push Subscriptions', () => {
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

  it('allows a user to subscribe multiple devices and receive notifications on both simultaneously', async () => {
    const resPc = await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: pcEndpoint, keys });
    expect(resPc.status).toBe(200);

    const resMobile = await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: mobileEndpoint, keys });
    expect(resMobile.status).toBe(200);

    const activeSubs = await PushSubscriptionRepository.findActiveSubscriptions(userId);
    expect(activeSubs.length).toBe(2);
    expect(activeSubs.map((s) => s.endpoint)).toEqual(expect.arrayContaining([pcEndpoint, mobileEndpoint]));

    const sendSpy = vi.spyOn(WebPushClient, 'send').mockResolvedValue(undefined as any);
    const sentCount = await WebPushService.sendPushToUser(userId, { title: 'Test Multi', body: 'Simultaneous Push' }, 'messages');
    expect(sentCount).toBe(2);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    const unsubPc = await request(server.app).post('/notifications/unsubscribe').send({ endpoint: pcEndpoint });
    expect(unsubPc.status).toBe(200);

    const subsAfterUnsub = await PushSubscriptionRepository.findActiveSubscriptions(userId);
    expect(subsAfterUnsub.length).toBe(1);
    expect(subsAfterUnsub[0].endpoint).toBe(mobileEndpoint);

    sendSpy.mockClear();
    const sentCount2 = await WebPushService.sendPushToUser(userId, { title: 'Test 2', body: 'Mobile Only' }, 'messages');
    expect(sentCount2).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    await request(server.app).patch('/notifications/preferences').set('Authorization', `Bearer ${userToken}`).send({ endpoint: mobileEndpoint, preferences: { upvotes: false } });
    const prefPc = await PushSubscriptionRepository.getPreferences(userId, pcEndpoint);
    const prefMobile = await PushSubscriptionRepository.getPreferences(userId, mobileEndpoint);
    expect(prefPc.preferences.upvotes).toBe(false);
    expect(prefMobile.preferences.upvotes).toBe(false);

    await PushSubscriptionRepository.deactivateSubscription(null, userId);
    const stillActive = await PushSubscriptionRepository.findActiveSubscriptions(userId);
    expect(stillActive.length).toBe(1);
  });
});
