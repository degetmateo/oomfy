import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Auxiliary & GIF Endpoints', () => {
  const server = new Server(5004);
  const userToken = TokenService.generateAccessToken({
    id: '019e6c9d-5b1d-7418-a4d3-auxuser1', username: 'auxuser', name: 'Aux User',
    email: 'aux@oomfy.online', role: 'member', sessionId: 'sess-aux-1',
  });

  beforeAll(async () => {
    await MongoDatabase.connect();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'sess-aux-1', status: 'active', role: 'member' }] }),
    } as any);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await MongoDatabase.close();
  });

  it('GET /aux/gifs should return klipy gifs array for authenticated user', async () => {
    const res = await request(server.app).get('/aux/gifs?q=cat&limit=5').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /aux/suggested-members should return members array for authenticated user', async () => {
    const res = await request(server.app).get('/aux/suggested-members?limit=3').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
