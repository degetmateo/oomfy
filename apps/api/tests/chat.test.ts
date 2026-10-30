import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';

describe('Chat and Notifications Endpoints', () => {
  const server = new Server(5006);

  it('should reject unauthenticated access to /api/chats', async () => {
    const res = await request(server.app).get('/api/chats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated access to /api/chats/unread-count', async () => {
    const res = await request(server.app).get('/api/chats/unread-count');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated access to /api/notifications', async () => {
    const res = await request(server.app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return online members as array without fallback', async () => {
    const res = await request(server.app).get('/api/aux/online-members');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

