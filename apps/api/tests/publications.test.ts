import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Publications Endpoints', () => {
  const server = new Server(5002);
  const authToken = TokenService.generateAccessToken({
    id: '019e6d84-f119-7088-8e10-5d287b352001',
    username: 'pub_tester',
    email: 'pub@test.com',
    role: 'member',
  });

  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  afterAll(async () => {
    await MongoDatabase.close();
  });

  it('allows public GET /publications for SEO and rejects unauthenticated POST /publications with 401', async () => {
    const getRes = await request(server.app).get('/publications?limit=5');
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);

    const postRes = await request(server.app).post('/publications').send({ content: 'Unauthorized post' });
    expect(postRes.status).toBe(401);
  });

  it('GET /publications should return feed of publications with valid IDs for authenticated user', async () => {
    const res = await request(server.app)
      .get('/publications?limit=5')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(typeof first.id).toBe('string');
    expect(first.author?.username).toBeDefined();
  });

  it('GET /publications/:id should return 404 for non-existent ID', async () => {
    const res = await request(server.app)
      .get('/publications/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /publications/:id should return publication and its thread for valid ID', async () => {
    const feedRes = await request(server.app).get('/publications?limit=1').set('Authorization', `Bearer ${authToken}`);
    expect(feedRes.status).toBe(200);
    const pubId = feedRes.body.data[0].id;

    const res = await request(server.app).get(`/publications/${pubId}`).set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.publication.id).toBe(pubId);
    expect(Array.isArray(res.body.data.thread)).toBe(true);
    expect(Array.isArray(res.body.data.ancestors)).toBe(true);
    expect(Array.isArray(res.body.data.replies)).toBe(true);

    const ancRes = await request(server.app).get(`/publications/${pubId}/ancestors`);
    expect(ancRes.status).toBe(200);
    expect(Array.isArray(ancRes.body.data.ancestors)).toBe(true);
  });

  it('UrlPreviewAdapter should correctly extract and identify URLs', async () => {
    const { UrlPreviewAdapter } = await import('../src/infrastructure/adapters/UrlPreviewAdapter.js');
    const textWithUrl = 'Mira esto https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT está genial';
    expect(UrlPreviewAdapter.extractFirstUrl(textWithUrl)).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  });

  it('GET /publications supports type=posts and liked_by filters', async () => {
    const res = await request(server.app).get('/publications?type=posts&limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const likedRes = await request(server.app).get('/publications?liked_by=buenardo_bro&limit=5');
    expect(likedRes.status).toBe(200);
    expect(Array.isArray(likedRes.body.data)).toBe(true);
  });
});
