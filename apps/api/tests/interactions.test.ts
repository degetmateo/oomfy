import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';

describe('Interactions Endpoints', () => {
  const server = new Server(5003);

  it('POST /interactions/:id/upvote should require auth', async () => {
    const res = await request(server.app).post('/interactions/019e6d84-f0de-74f8-8517-bbb2824111a6/upvote');
    expect(res.status).toBe(401);
  });

  it('DELETE /interactions/:id/upvote should require auth', async () => {
    const res = await request(server.app).delete('/interactions/019e6d84-f0de-74f8-8517-bbb2824111a6/upvote');
    expect(res.status).toBe(401);
  });

  it('POST /interactions/:id/share should require auth', async () => {
    const res = await request(server.app).post('/interactions/019e6d84-f0de-74f8-8517-bbb2824111a6/share');
    expect(res.status).toBe(401);
  });

  it('DELETE /interactions/:id/share should require auth', async () => {
    const res = await request(server.app).delete('/interactions/019e6d84-f0de-74f8-8517-bbb2824111a6/share');
    expect(res.status).toBe(401);
  });
});
