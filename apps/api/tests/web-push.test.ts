import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';

describe('WebPushService and Notification Endpoints', () => {
  const server = new Server(5016);

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({
      $or: [
        { endpoint: { $regex: /fake-/ } },
      ],
    });
  });

  afterAll(async () => {
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({
      endpoint: { $regex: /fake-/ },
    });
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

  it('saves, deactivates without deleting, reactivates, and transfers subscription across accounts', async () => {
    const userAToken = TokenService.generateAccessToken({
      id: '019e6d84-f119-7088-8e10-5d287b352b11',
      username: 'user_a',
      email: 'usera@test.com',
      role: 'member',
    });

    const userBToken = TokenService.generateAccessToken({
      id: '019e6d84-f119-7088-8e10-5d287b352b22',
      username: 'user_b',
      email: 'userb@test.com',
      role: 'member',
    });

    const endpoint = `https://fcm.googleapis.com/fcm/send/fake-lifecycle-endpoint-${Date.now()}`;
    const subPayload = {
      endpoint,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0PwsGCDBeIo63EYE5OgOA5iJViGMW8WUM5P-55W',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    };

    // 1. User A activates push
    const subRes = await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(subPayload);
    expect(subRes.status).toBe(200);

    const col = MongoDatabase.getDb().collection('push_subscriptions');
    let doc = await col.findOne({ endpoint });
    expect(doc).toBeDefined();
    expect(doc?.is_active).toBe(true);

    // 2. User A logs out -> deactivates without deleting document
    const unsubRes = await request(server.app)
      .post('/api/notifications/unsubscribe')
      .send({ endpoint });
    expect(unsubRes.status).toBe(200);

    doc = await col.findOne({ endpoint });
    expect(doc).toBeDefined();
    expect(doc?.is_active).toBe(false);

    // 3. User B logs in on same device -> transfers ownership and reactivates
    const subBRes = await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userBToken}`)
      .send(subPayload);
    expect(subBRes.status).toBe(200);

    doc = await col.findOne({ endpoint });
    expect(doc).toBeDefined();
    expect(doc?.is_active).toBe(true);

    // Active for user B, inactive for user A
    const activeForA = await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b11');
    const activeForB = await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b22');
    expect(activeForA.length).toBe(0);
    expect(activeForB.length).toBe(1);
  });

  it('manages notification preferences and filters categories correctly', async () => {
    const userToken = TokenService.generateAccessToken({
      id: '019e6d84-f119-7088-8e10-5d287b352b33',
      username: 'user_c',
      email: 'userc@test.com',
      role: 'member',
    });

    const endpoint = `https://fcm.googleapis.com/fcm/send/fake-pref-endpoint-${Date.now()}`;
    await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        endpoint,
        keys: { p256dh: 'fake-p256', auth: 'fake-auth' },
      });

    // Check defaults
    const prefRes1 = await request(server.app)
      .get(`/api/notifications/preferences?endpoint=${encodeURIComponent(endpoint)}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(prefRes1.status).toBe(200);
    expect(prefRes1.body.preferences.messages).toBe(true);
    expect(prefRes1.body.preferences.replies).toBe(true);

    // Disable messages
    const updateRes = await request(server.app)
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ endpoint, preferences: { messages: false } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.preferences.messages).toBe(false);
    expect(updateRes.body.preferences.replies).toBe(true);

    // Verify repository filtering
    const forMessages = await PushSubscriptionRepository.findActiveSubscriptions(
      '019e6d84-f119-7088-8e10-5d287b352b33',
      'messages'
    );
    const forReplies = await PushSubscriptionRepository.findActiveSubscriptions(
      '019e6d84-f119-7088-8e10-5d287b352b33',
      'replies'
    );
    expect(forMessages.length).toBe(0);
    expect(forReplies.length).toBe(1);
  });

  it('detects expired subscriptions and seamlessly renews them linking previous endpoint', async () => {
    const userToken = TokenService.generateAccessToken({
      id: '019e6d84-f119-7088-8e10-5d287b352b44',
      username: 'user_d',
      email: 'userd@test.com',
      role: 'member',
    });

    const oldEndpoint = `https://fcm.googleapis.com/fcm/send/fake-expired-endpoint-${Date.now()}`;
    await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        endpoint: oldEndpoint,
        keys: { p256dh: 'p256-old', auth: 'auth-old' },
      });

    await PushSubscriptionRepository.markExpired(oldEndpoint);

    const statusRes = await request(server.app)
      .get(`/api/notifications/preferences?endpoint=${encodeURIComponent(oldEndpoint)}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(statusRes.body.status).toBe('expired');
    expect(statusRes.body.is_active).toBe(false);

    const newEndpoint = `https://fcm.googleapis.com/fcm/send/fake-renewed-endpoint-${Date.now()}`;
    const renewRes = await request(server.app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        endpoint: newEndpoint,
        keys: { p256dh: 'p256-new', auth: 'auth-new' },
        previous_endpoint: oldEndpoint,
      });
    expect(renewRes.status).toBe(200);

    const renewedCheck = await request(server.app)
      .get(`/api/notifications/preferences?endpoint=${encodeURIComponent(newEndpoint)}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(renewedCheck.body.status).toBe('active');
    expect(renewedCheck.body.is_active).toBe(true);
  });

  it('allows admin to broadcast push notifications via POST /api/admin/notifications/push/broadcast', async () => {
    const adminToken = TokenService.generateAccessToken({
      id: 'admin-push-tester',
      username: 'adminpusher',
      email: 'admin@push.com',
      role: 'admin',
    });

    const res = await request(server.app)
      .post('/api/admin/notifications/push/broadcast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Anuncio Global',
        body: 'Prueba de push administrativa',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sent_count).toBeDefined();
  });
});
