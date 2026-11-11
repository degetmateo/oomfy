import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';

describe('WebPush Subscription Lifecycle', () => {
  const server = new Server(5016);

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-life-/ } });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (_sql: string, params?: any[]) => ({
        rows: [{ id: params?.[0], status: 'active', role: 'member' }],
      })),
    } as any);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-life-/ } });
    await MongoDatabase.disconnect();
  });

  it('provides a public VAPID key via GET /notifications/vapid-public-key', async () => {
    const res = await request(server.app).get('/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(typeof res.body.publicKey).toBe('string');
  });

  it('saves, deactivates, reactivates across logout, and blocks active hijacking', async () => {
    const userAToken = TokenService.generateAccessToken({ id: '019e6d84-f119-7088-8e10-5d287b352b11', username: 'user_a', email: 'usera@test.com', role: 'member', sessionId: 'sess-wp-a' });
    const userBToken = TokenService.generateAccessToken({ id: '019e6d84-f119-7088-8e10-5d287b352b22', username: 'user_b', email: 'userb@test.com', role: 'member', sessionId: 'sess-wp-b' });
    const endpoint = `https://fcm.googleapis.com/fcm/send/fake-life-endpoint-${Date.now()}`;
    const subPayload = { endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0PwsGCDBeIo63EYE5OgOA5iJViGMW8WUM5P-55W', auth: 'tBHItJI5svbpez7KI4CCXg' } };

    expect((await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userAToken}`).send(subPayload)).status).toBe(200);
    expect((await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userBToken}`).send(subPayload)).status).toBe(403);

    expect((await request(server.app).post('/notifications/unsubscribe').send({ endpoint })).status).toBe(200);
    const col = MongoDatabase.getDb().collection('push_subscriptions');
    expect((await col.findOne({ endpoint }))?.is_active).toBe(false);

    expect((await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userBToken}`).send(subPayload)).status).toBe(200);
    expect((await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b11')).length).toBe(0);
    expect((await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b22')).length).toBe(1);
  });

  it('detects expired subscriptions and seamlessly renews them linking previous endpoint', async () => {
    const userToken = TokenService.generateAccessToken({ id: '019e6d84-f119-7088-8e10-5d287b352b44', username: 'user_d', email: 'userd@test.com', role: 'member', sessionId: 'sess-wp-d' });
    const oldEndpoint = `https://fcm.googleapis.com/fcm/send/fake-life-expired-${Date.now()}`;
    await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: oldEndpoint, keys: { p256dh: 'p256-old', auth: 'auth-old' } });
    await PushSubscriptionRepository.markExpired(oldEndpoint);

    const statusRes = await request(server.app).get(`/notifications/preferences?endpoint=${encodeURIComponent(oldEndpoint)}`).set('Authorization', `Bearer ${userToken}`);
    expect(statusRes.body.status).toBe('expired');
    expect(statusRes.body.is_active).toBe(false);

    const newEndpoint = `https://fcm.googleapis.com/fcm/send/fake-life-renewed-${Date.now()}`;
    expect((await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint: newEndpoint, keys: { p256dh: 'p256-new', auth: 'auth-new' }, previous_endpoint: oldEndpoint })).status).toBe(200);

    const renewedCheck = await request(server.app).get(`/notifications/preferences?endpoint=${encodeURIComponent(newEndpoint)}`).set('Authorization', `Bearer ${userToken}`);
    expect(renewedCheck.body.status).toBe('active');
    expect(renewedCheck.body.is_active).toBe(true);
  });
});
