import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';

describe('Profile Media Dynamic Redirection', () => {
  const server = new Server(5007);

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({
      id: '018f3a2b-7c1e-7b2a-9f5b-testiconuser',
      username: 'test_media_user',
      name: 'Test Media User',
      icon_url: 'https://i.ibb.co/test-icon.png',
      banner_url: 'https://i.ibb.co/test-banner.png',
    });
  });

  it('should redirect GET /api/members/:username/icon to avatar URL with 302', async () => {
    const res = await request(server.app).get('/api/members/test_media_user/icon').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://i.ibb.co/test-icon.png');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('should redirect GET /api/members/:username/banner to banner URL with 302', async () => {
    const res = await request(server.app).get('/api/members/test_media_user/banner').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://i.ibb.co/test-banner.png');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('should return 404 when requested media does not exist', async () => {
    const res = await request(server.app).get('/api/members/non_existent_oomfy_user/icon').redirects(0);
    expect(res.status).toBe(404);
  });
});
