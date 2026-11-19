import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../src/infrastructure/repositories/mongo/MongoFollowRepository.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';

describe('Online Members Banner & Privacy Settings', () => {
  const server = new Server(5020);
  const viewerId = '019e6d84-f119-7088-8e10-5d287b357001';
  const tokenA = TokenService.generateAccessToken({
    id: viewerId,
    username: 'online_vis_a',
    email: 'ova@test.com',
    role: 'member',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /aux/online-members returns at most 6 random visible online members', async () => {
    const ids = Array.from({ length: 9 }, (_, i) => `u-on-${i + 1}`);
    const members = ids.map((id, i) => ({
      id,
      username: i === 8 ? 'hidden_member' : `online_${i + 1}`,
      name: `Member ${i + 1}`,
      role: 'member' as const,
      bio: null,
      location: null,
      link: null,
      created_at: new Date().toISOString(),
      icon_url: null,
      banner_url: null,
      follower_count: 0,
      followed_count: 0,
      publication_count: 0,
      show_online_status: i !== 8,
    }));

    vi.spyOn(SocketGateway, 'getOnlineUserIds').mockReturnValue(ids);
    vi.spyOn(MongoMemberRepository, 'findManyByIds').mockResolvedValue(members);
    vi.spyOn(MongoFollowRepository, 'isFollowing').mockResolvedValue(false);

    const res = await request(server.app).get('/aux/online-members?limit=12').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data.every((m: any) => m.username !== 'hidden_member')).toBe(true);
  });

  it('PUT and PATCH /settings/online-status update DB, SocketGateway invisibility, and broadcast updates', async () => {
    const repoSpy = vi.spyOn(MongoMemberRepository, 'setOnlineStatusVisibility').mockResolvedValue();
    const broadcastSpy = vi.spyOn(SocketGateway, 'broadcastOnlineMembersUpdated').mockImplementation(() => {});
    const invisSpy = vi.spyOn(SocketGateway, 'setUserInvisible');

    const putRes = await request(server.app)
      .put('/settings/online-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ show_online_status: false });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.show_online_status).toBe(false);
    expect(repoSpy).toHaveBeenCalledWith(viewerId, false);
    expect(invisSpy).toHaveBeenCalledWith(viewerId, true);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);

    const patchRes = await request(server.app)
      .patch('/settings/online-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ show_online_status: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.show_online_status).toBe(true);
    expect(repoSpy).toHaveBeenCalledWith(viewerId, true);
    expect(invisSpy).toHaveBeenCalledWith(viewerId, false);
    expect(broadcastSpy).toHaveBeenCalledTimes(2);
  });
});
