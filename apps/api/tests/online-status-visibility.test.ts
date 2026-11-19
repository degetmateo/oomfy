import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';

describe('Online members privacy removal', () => {
  const server = new Server(5020);
  const userA = {
    id: '019e6d84-f119-7088-8e10-5d287b357001',
    username: 'online_vis_a',
    email: 'ova@test.com',
    role: 'member' as const,
  };
  const tokenA = TokenService.generateAccessToken(userA);

  beforeAll(() => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 for removed GET /aux/online-members and PUT/PATCH /settings/online-status endpoints', async () => {
    const auxRes = await request(server.app).get('/aux/online-members').set('Authorization', `Bearer ${tokenA}`);
    expect(auxRes.status).toBe(404);

    const putRes = await request(server.app)
      .put('/settings/online-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ show_online_status: false });
    expect(putRes.status).toBe(404);

    const patchRes = await request(server.app)
      .patch('/settings/online-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ show_online_status: true });
    expect(patchRes.status).toBe(404);
  });
});
