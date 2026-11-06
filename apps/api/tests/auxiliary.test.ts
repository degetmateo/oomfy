import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Auxiliary & GIF Endpoints', () => {
  const server = new Server(5004);
  const userToken = TokenService.generateAccessToken({
    id: '019e6c9d-5b1d-7418-a4d3-auxuser1',
    username: 'auxuser',
    name: 'Aux User',
    email: 'aux@oomfy.online',
    role: 'member',
  });

  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  afterAll(async () => {
    await MongoDatabase.close();
  });

  it('GET /aux/gifs should return klipy gifs array for authenticated user', async () => {
    const res = await request(server.app)
      .get('/aux/gifs?q=cat&limit=5')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /aux/suggested-members should return members array for authenticated user', async () => {
    const res = await request(server.app)
      .get('/aux/suggested-members?limit=3')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
