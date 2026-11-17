import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';
import { registerSocketHandlers } from '../src/socket/SocketHandlers.js';

describe('Online status visibility / Invisible mode', () => {
  const server = new Server(5020);
  const userA = { id: '019e6d84-f119-7088-8e10-5d287b357001', username: 'online_vis_a', email: 'ova@test.com', role: 'member' as const };
  const userB = { id: '019e6d84-f119-7088-8e10-5d287b357002', username: 'online_vis_b', email: 'ovb@test.com', role: 'member' as const };
  const tokenA = TokenService.generateAccessToken(userA);

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: userA.id, username: userA.username, name: 'Online A', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: userB.id, username: userB.username, name: 'Online B', role: 'member' });
    (SocketGateway as any).userSockets.set(userA.id, new Set(['sock-a']));
    (SocketGateway as any).userSockets.set(userB.id, new Set(['sock-b']));
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    (SocketGateway as any).userSockets.delete(userA.id);
    (SocketGateway as any).userSockets.delete(userB.id);
    SocketGateway.setUserInvisible(userA.id, false);
    SocketGateway.setUserInvisible(userB.id, false);
    const db = MongoDatabase.getDb();
    const ids = [userA.id, userB.id].flatMap((id) => MongoIdHelper.idVariants(id));
    await db.collection('members').deleteMany({ id: { $in: ids } });
    await MongoDatabase.close();
  });

  it('hides user from online members when show_online_status is false and restores when true', async () => {
    const initial = await request(server.app).get('/aux/online-members');
    expect(initial.status).toBe(200);
    expect(initial.body.data.some((m: any) => m.id === userA.id)).toBe(true);

    const hideRes = await request(server.app).put('/settings/online-status').set('Authorization', `Bearer ${tokenA}`).send({ show_online_status: false });
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data.show_online_status).toBe(false);
    expect(SocketGateway.isUserOnline(userA.id)).toBe(false);
    expect(SocketGateway.isUserOnline(userB.id)).toBe(true);

    const meRes = await request(server.app).get('/members/me').set('Authorization', `Bearer ${tokenA}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.show_online_status).toBe(false);

    const listWhileHidden = await request(server.app).get('/aux/online-members');
    expect(listWhileHidden.body.data.some((m: any) => m.id === userA.id)).toBe(false);
    expect(listWhileHidden.body.data.some((m: any) => m.id === userB.id)).toBe(true);

    const showRes = await request(server.app).patch('/settings/online-status').set('Authorization', `Bearer ${tokenA}`).send({ show_online_status: true });
    expect(showRes.status).toBe(200);
    expect(SocketGateway.isUserOnline(userA.id)).toBe(true);
    const listRestored = await request(server.app).get('/aux/online-members');
    expect(listRestored.body.data.some((m: any) => m.id === userA.id)).toBe(true);
  });

  it('syncs persisted invisible status when registering a socket connection', async () => {
    await MongoMemberRepository.setOnlineStatusVisibility(userB.id, false);
    SocketGateway.setUserInvisible(userB.id, false);
    const map = (SocketGateway as any).userSockets as Map<string, Set<string>>;
    const fakeSocket = { id: 'sock-b-2', user: userB, join: vi.fn(), on: vi.fn() } as any;
    registerSocketHandlers(fakeSocket, map);
    await vi.waitFor(() => expect(SocketGateway.isUserOnline(userB.id)).toBe(false), { timeout: 1000 });
  });
});
