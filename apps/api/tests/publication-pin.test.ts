import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';

describe('Publication Pin Endpoints', () => {
  const server = new Server(5016);
  const user = { id: '019e6d84-f119-7088-8e10-5d287b352003', username: 'pin_tester', email: 'pin@test.com', role: 'member' as const };
  const token = TokenService.generateAccessToken(user);

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (payload) => payload);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: user.id, username: user.username, name: 'Pin Tester', role: 'member' });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const uVars = MongoIdHelper.idVariants(user.id);
    await db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: uVars } }, { 'author.username': user.username }] });
    await db.collection('members').deleteMany({ $or: [{ id: { $in: uVars } }, { username: user.username }] });
    await MongoDatabase.close();
  });

  it('rejects unauthenticated pin requests with 401', async () => {
    const res = await request(server.app).post('/publications/00000000-0000-0000-0000-000000000000/pin');
    expect(res.status).toBe(401);
  });

  it('returns 404 when pinning a non-existent publication', async () => {
    const res = await request(server.app)
      .post('/publications/00000000-0000-0000-0000-000000000000/pin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('allows user to pin a publication, replaces previous, and unpins cleanly', async () => {
    const post1 = await request(server.app).post('/publications').set('Authorization', `Bearer ${token}`).field('content', 'First post to pin');
    const post2 = await request(server.app).post('/publications').set('Authorization', `Bearer ${token}`).field('content', 'Second post to replace');
    const pubId1 = post1.body.data.id;
    const pubId2 = post2.body.data.id;

    const pin1Res = await request(server.app).post(`/publications/${pubId1}/pin`).set('Authorization', `Bearer ${token}`);
    expect(pin1Res.status).toBe(200);
    expect(pin1Res.body.pinned_publication_id).toBe(pubId1);

    let profileRes = await request(server.app).get(`/members/${user.username}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.pinned_publication_id).toBe(pubId1);
    expect(profileRes.body.data.pinned_publication?.id).toBe(pubId1);

    const pin2Res = await request(server.app).post(`/publications/${pubId2}/pin`).set('Authorization', `Bearer ${token}`);
    expect(pin2Res.status).toBe(200);
    expect(pin2Res.body.pinned_publication_id).toBe(pubId2);

    profileRes = await request(server.app).get(`/members/${user.username}`);
    expect(profileRes.body.data.pinned_publication_id).toBe(pubId2);
    expect(profileRes.body.data.pinned_publication?.id).toBe(pubId2);

    const unpinRes = await request(server.app).delete(`/publications/${pubId2}/pin`).set('Authorization', `Bearer ${token}`);
    expect(unpinRes.status).toBe(200);
    expect(unpinRes.body.pinned_publication_id).toBeNull();

    profileRes = await request(server.app).get(`/members/${user.username}`);
    expect(profileRes.body.data.pinned_publication_id).toBeNull();
    expect(profileRes.body.data.pinned_publication).toBeNull();
  });
});

