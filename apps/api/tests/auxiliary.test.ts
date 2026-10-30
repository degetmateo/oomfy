import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';

describe('Auxiliary & GIF Endpoints', () => {
  const server = new Server(5004);

  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  afterAll(async () => {
    await MongoDatabase.close();
  });

  it('GET /api/aux/gifs should return klipy gifs array', async () => {
    const res = await request(server.app).get('/api/aux/gifs?q=cat&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/aux/suggested-members should return members array', async () => {
    const res = await request(server.app).get('/api/aux/suggested-members?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

