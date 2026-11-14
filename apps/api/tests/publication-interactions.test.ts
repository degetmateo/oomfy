import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';

describe('Publication Interactions Endpoints', () => {
  const server = new Server(5015);
  const user = {
    id: '019e6d84-f119-7088-8e10-5d287b352002',
    username: 'interaction_tester',
    email: 'interactions@test.com',
    role: 'member' as const,
  };
  const token = TokenService.generateAccessToken(user);

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (payload) => payload);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({
      id: user.id,
      username: user.username,
      name: 'Interaction Tester',
      role: 'member',
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const uVars = MongoIdHelper.idVariants(user.id);
    await db.collection('upvotes').deleteMany({ user_id: { $in: uVars } });
    await db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: uVars } }, { 'author.username': user.username }] });
    await db.collection('notifications').deleteMany({ $or: [{ recipient_id: { $in: uVars } }, { sender_id: { $in: uVars } }] });
    await db.collection('members').deleteMany({ $or: [{ id: { $in: uVars } }, { username: user.username }] });
    await MongoDatabase.close();
  });

  it('returns 404 when querying interactions of a non-existent publication', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const resLikes = await request(server.app).get(`/publications/${invalidId}/interactions/likes`);
    const resShares = await request(server.app).get(`/publications/${invalidId}/interactions/shares`);
    const resQuotes = await request(server.app).get(`/publications/${invalidId}/interactions/quotes`);

    expect(resLikes.status).toBe(404);
    expect(resShares.status).toBe(404);
    expect(resQuotes.status).toBe(404);
  });

  it('allows unauthenticated and paginated interaction queries on an existing post', async () => {
    const feedRes = await request(server.app).get('/publications?limit=1');
    expect(feedRes.status).toBe(200);
    const pubId = feedRes.body.data[0]?.id;
    if (!pubId) return;

    const likesRes = await request(server.app).get(`/publications/${pubId}/interactions/likes?limit=5&offset=0`);
    expect(likesRes.status).toBe(200);
    expect(likesRes.body.success).toBe(true);
    expect(Array.isArray(likesRes.body.data)).toBe(true);

    const sharesRes = await request(server.app).get(`/publications/${pubId}/interactions/shares?limit=5&offset=0`);
    expect(sharesRes.status).toBe(200);
    expect(sharesRes.body.success).toBe(true);
    expect(Array.isArray(sharesRes.body.data)).toBe(true);

    const quotesRes = await request(server.app).get(`/publications/${pubId}/interactions/quotes?limit=5&offset=0`);
    expect(quotesRes.status).toBe(200);
    expect(quotesRes.body.success).toBe(true);
    expect(Array.isArray(quotesRes.body.data)).toBe(true);
  });

  it('lists upvoter and sharer when user interacts with a publication', async () => {
    const createRes = await request(server.app)
      .post('/publications')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Testing interactions endpoints');
    expect(createRes.status).toBe(201);
    const pubId = createRes.body.data.id;

    await request(server.app)
      .post(`/interactions/${pubId}/upvote`)
      .set('Authorization', `Bearer ${token}`);

    const likesRes = await request(server.app).get(`/publications/${pubId}/interactions/likes`);
    expect(likesRes.status).toBe(200);
    expect(likesRes.body.data.some((u: any) => u.username === user.username)).toBe(true);

    await request(server.app)
      .post(`/interactions/${pubId}/share`)
      .set('Authorization', `Bearer ${token}`);

    const sharesRes = await request(server.app).get(`/publications/${pubId}/interactions/shares`);
    expect(sharesRes.status).toBe(200);
    expect(sharesRes.body.data.some((u: any) => u.username === user.username)).toBe(true);
  });
});
