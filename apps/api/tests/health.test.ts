import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';

describe('API Server Health & Endpoints', () => {
  const server = new Server(5001);

  it('should respond 200 on /health', async () => {
    const res = await request(server.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 401 on protected route without auth token', async () => {
    const res = await request(server.app).get('/api/members/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

