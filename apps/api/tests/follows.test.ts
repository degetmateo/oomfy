import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Follows API Endpoints & Pagination', () => {
  const server = new Server(5008);
  let userToken: string;

  beforeAll(async () => {
    await MongoDatabase.connect();
    userToken = TokenService.generateAccessToken({
      id: '019e6c9d-5b1d-7418-a4d3-4ade44b1d699',
      username: 'buenardo_bro',
      name: 'mateo',
      email: 'mateo@oomfy.online',
      role: 'admin',
    });
  });

  it('POST /api/follows/:username should require authentication (401)', async () => {
    const res = await request(server.app).post('/api/follows/someuser');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/follows/:username should require authentication (401)', async () => {
    const res = await request(server.app).delete('/api/follows/someuser');
    expect(res.status).toBe(401);
  });

  it('GET /api/follows/:username/following should return followed users with pagination', async () => {
    const res1 = await request(server.app)
      .get('/api/follows/buenardo_bro/following?limit=10&offset=0')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(Array.isArray(res1.body.data)).toBe(true);

    if (res1.body.data.length > 0) {
      const first = res1.body.data[0];
      expect(first.id).toBeDefined();
      expect(typeof first.id).toBe('string');
      expect(typeof first.is_following).toBe('boolean');
      expect(first.is_following).toBe(true);
    }

    const res2 = await request(server.app)
      .get('/api/follows/buenardo_bro/following?limit=10&offset=10')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(Array.isArray(res2.body.data)).toBe(true);
  });

  it('GET /api/follows/:username/followers should return followers list', async () => {
    const res = await request(server.app)
      .get('/api/follows/buenardo_bro/followers?limit=10&offset=0')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

