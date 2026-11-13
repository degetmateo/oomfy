import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';

describe('Username Validation API Constraints', () => {
  const server = new Server(5012);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects POST /auth/signup with 400 when username contains non-English characters or symbols', async () => {
    const invalidUsernames = ['userñ', 'café_1', 'user-name', 'user.name', 'user@oomfy', 'user!123'];

    for (const username of invalidUsernames) {
      const res = await request(server.app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          username,
          name: 'Test User',
          password: 'Password123',
          accepted_terms: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Solo se permiten letras del alfabeto inglés, números y guiones bajos.');
    }
  });
});

