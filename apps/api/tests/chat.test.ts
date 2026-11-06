import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Chat and Notifications Endpoints', () => {
  const server = new Server(5006);
  const userToken = TokenService.generateAccessToken({
    id: '019e6c9d-5b1d-7418-a4d3-chatuser1',
    username: 'chatuser',
    name: 'Chat User',
    email: 'chat@oomfy.online',
    role: 'member',
  });

  it('should reject unauthenticated access to /chats', async () => {
    const res = await request(server.app).get('/chats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated access to /chats/unread-count', async () => {
    const res = await request(server.app).get('/chats/unread-count');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated access to /notifications', async () => {
    const res = await request(server.app).get('/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return online members as array with authentication', async () => {
    const res = await request(server.app)
      .get('/aux/online-members')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
