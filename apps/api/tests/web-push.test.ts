import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';

describe('WebPushService and Notification Endpoints', () => {
  const server = new Server(5016);

  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  afterAll(async () => {
    await MongoDatabase.disconnect();
  });

  it('provides a public VAPID key via GET /api/notifications/vapid-public-key', async () => {
    const res = await request(server.app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.publicKey).toBeDefined();
    expect(typeof res.body.publicKey).toBe('string');
    expect(res.body.publicKey.length).toBeGreaterThan(10);
  });

  it('saves and deletes push subscription for authenticated user', async () => {
    const userToken = TokenService.generateAccessToken({
      id: 'push-test-user-1',
      username: 'pushtester',
      email: 'push@test.com',
      role: 'member',
    });

    const endpoint = 'https://fcm.googleapis.com/fcm/send/fake-endpoint-test-123';
    const subPayload = {
      endpoint,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0PwsGCDBeIo63EYE5OgOA5iJViGMW8WUM5P-55W',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    };

    const subRes = await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send(subPayload);

    expect(subRes.status).toBe(200);
    expect(subRes.body.success).toBe(true);

    const col = MongoDatabase.getDb().collection('push_subscriptions');
    const doc = await col.findOne({ endpoint });
    expect(doc).toBeDefined();
    expect(doc?.user_id).toBe('push-test-user-1');
    expect(doc?._id).toBeDefined();

    const unsubRes = await request(server.app)
      .post('/api/notifications/unsubscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ endpoint });

    expect(unsubRes.status).toBe(200);
    const deleted = await col.findOne({ endpoint });
    expect(deleted).toBeNull();
  });
});

