import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Follows Endpoints & Pagination', () => {
  const server = new Server(5008);
  let userToken: string;

  beforeAll(async () => {
    await MongoDatabase.connect();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'sess-fol-1', status: 'active', role: 'admin' }] }),
    } as any);
    userToken = TokenService.generateAccessToken({
      id: '019e6c9d-5b1d-7418-a4d3-4ade44b1d699', username: 'buenardo_bro', name: 'mateo',
      email: 'mateo@oomfy.online', role: 'admin', sessionId: 'sess-fol-1',
    });
  });

  afterAll(() => vi.restoreAllMocks());

  it('POST /follows/:username should require authentication (401)', async () => {
    expect((await request(server.app).post('/follows/someuser')).status).toBe(401);
  });

  it('DELETE /follows/:username should require authentication (401)', async () => {
    expect((await request(server.app).delete('/follows/someuser')).status).toBe(401);
  });

  it('GET /follows/:username/following should return followed users with pagination', async () => {
    const res1 = await request(server.app).get('/follows/buenardo_bro/following?limit=10&offset=0').set('Authorization', `Bearer ${userToken}`);
    expect(res1.status).toBe(200);
    expect(Array.isArray(res1.body.data)).toBe(true);
    if (res1.body.data.length > 0) {
      expect(res1.body.data[0].is_following).toBe(true);
    }

    const res2 = await request(server.app).get('/follows/buenardo_bro/following?limit=10&offset=10').set('Authorization', `Bearer ${userToken}`);
    expect(res2.status).toBe(200);
    expect(Array.isArray(res2.body.data)).toBe(true);
  });

  it('GET /follows/:username/followers should return followers list', async () => {
    const res = await request(server.app).get('/follows/buenardo_bro/followers?limit=10&offset=0').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
