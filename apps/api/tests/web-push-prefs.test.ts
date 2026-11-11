import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';

describe('WebPush Preferences & Admin Broadcast', () => {
  const server = new Server(5017);

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-pref-/ } });
  });

  afterAll(async () => {
    await MongoDatabase.getDb().collection('push_subscriptions').deleteMany({ endpoint: { $regex: /fake-pref-/ } });
    await MongoDatabase.disconnect();
  });

  it('manages notification preferences and filters categories correctly', async () => {
    const userToken = TokenService.generateAccessToken({ id: '019e6d84-f119-7088-8e10-5d287b352b33', username: 'user_c', email: 'userc@test.com', role: 'member' });
    const endpoint = `https://fcm.googleapis.com/fcm/send/fake-pref-endpoint-${Date.now()}`;
    await request(server.app).post('/notifications/subscribe').set('Authorization', `Bearer ${userToken}`).send({ endpoint, keys: { p256dh: 'fake-p256', auth: 'fake-auth' } });

    const prefRes1 = await request(server.app).get(`/notifications/preferences?endpoint=${encodeURIComponent(endpoint)}`).set('Authorization', `Bearer ${userToken}`);
    expect(prefRes1.status).toBe(200);
    expect(prefRes1.body.preferences.messages).toBe(true);
    expect(prefRes1.body.preferences.replies).toBe(true);

    const updateRes = await request(server.app).patch('/notifications/preferences').set('Authorization', `Bearer ${userToken}`).send({ endpoint, preferences: { messages: false } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.preferences.messages).toBe(false);
    expect(updateRes.body.preferences.replies).toBe(true);

    expect((await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b33', 'messages')).length).toBe(0);
    expect((await PushSubscriptionRepository.findActiveSubscriptions('019e6d84-f119-7088-8e10-5d287b352b33', 'replies')).length).toBe(1);
  });

  it('allows admin to broadcast push notifications via POST /admin/notifications/push/broadcast', async () => {
    const adminToken = TokenService.generateAccessToken({ id: 'admin-push-tester', username: 'adminpusher', email: 'admin@push.com', role: 'admin' });
    const res = await request(server.app).post('/admin/notifications/push/broadcast').set('Authorization', `Bearer ${adminToken}`).send({ title: 'Anuncio Global', body: 'Prueba de push administrativa' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sent_count).toBeDefined();
  });
});

