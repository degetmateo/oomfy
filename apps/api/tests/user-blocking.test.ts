import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../src/infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';
import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres/PostgresUserRepository.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { ChatService } from '../src/services/chat/ChatService.js';
import { MessageService } from '../src/services/chat/MessageService.js';

describe('User Blocking Enforcement & Endpoints', () => {
  const server = new Server(5017);
  const blocker = { id: '019e6d84-f119-7088-8e10-5d287b352010', username: 'block_owner_test', email: 'bo@test.com', role: 'member' as const };
  const blocked = { id: '019e6d84-f119-7088-8e10-5d287b352011', username: 'blocked_user_test', email: 'bu@test.com', role: 'member' as const };
  const blockerToken = TokenService.generateAccessToken(blocker);
  const blockedToken = TokenService.generateAccessToken(blocked);
  const chatId = uuidv7();
  let blockerPubId = '';

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: blocker.id, username: blocker.username, name: 'Block Owner', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: blocked.id, username: blocked.username, name: 'Blocked User', role: 'member' });
    const postRes = await request(server.app).post('/publications').set('Authorization', `Bearer ${blockerToken}`).field('content', 'Blocker post for test');
    blockerPubId = postRes.body.data.id;
    await request(server.app).post(`/follows/${blocker.username}`).set('Authorization', `Bearer ${blockedToken}`);
    await MongoChatRepository.createPrivateChat(chatId, { id: blocker.id, user_id: blocker.id, username: blocker.username, name: 'Block Owner', icon_url: null }, { id: blocked.id, user_id: blocked.id, username: blocked.username, name: 'Blocked User', icon_url: null });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const uVars = [...MongoIdHelper.idVariants(blocker.id), ...MongoIdHelper.idVariants(blocked.id)];
    const cVars = MongoIdHelper.idVariants(chatId);
    await db.collection('blocks').deleteMany({ $or: [{ blocker_id: { $in: uVars } }, { blocked_id: { $in: uVars } }] });
    await db.collection('follows').deleteMany({ $or: [{ follower_id: { $in: uVars } }, { followed_id: { $in: uVars } }] });
    await db.collection('upvotes').deleteMany({ user_id: { $in: uVars } });
    await db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: uVars } }, { 'author.username': { $in: [blocker.username, blocked.username] } }] });
    await db.collection('notifications').deleteMany({ $or: [{ recipient_id: { $in: uVars } }, { sender_id: { $in: uVars } }] });
    await db.collection('messages').deleteMany({ chat_id: { $in: cVars } });
    await db.collection('chats').deleteMany({ $or: [{ _id: { $in: cVars } }, { id: { $in: cVars } }] });
    await db.collection('members').deleteMany({ username: { $in: [blocker.username, blocked.username] } });
    await MongoDatabase.close();
  });

  it('blocks user, breaks follow, exposes status, and blocks all interactions until unblocked', async () => {
    const blockRes = await request(server.app).post(`/members/${blocked.username}/block`).set('Authorization', `Bearer ${blockerToken}`);
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.blocked).toBe(true);
    expect(await MongoFollowRepository.isFollowing(blocked.id, blocker.id)).toBe(false);

    const profAsBlocker = await request(server.app).get(`/members/${blocked.username}`).set('Authorization', `Bearer ${blockerToken}`);
    expect(profAsBlocker.body.data.is_blocked).toBe(true);
    const profAsBlocked = await request(server.app).get(`/members/${blocker.username}`).set('Authorization', `Bearer ${blockedToken}`);
    expect(profAsBlocked.body.data.has_blocked_viewer).toBe(true);

    expect((await request(server.app).post(`/follows/${blocker.username}`).set('Authorization', `Bearer ${blockedToken}`)).status).toBe(403);
    expect((await request(server.app).post(`/interactions/${blockerPubId}/upvote`).set('Authorization', `Bearer ${blockedToken}`)).status).toBe(403);
    expect((await request(server.app).post(`/interactions/${blockerPubId}/share`).set('Authorization', `Bearer ${blockedToken}`)).status).toBe(403);
    expect((await request(server.app).post('/publications').set('Authorization', `Bearer ${blockedToken}`).field('target_id', blockerPubId).field('type', 'reply').field('content', 'blocked reply')).status).toBe(403);
    expect((await request(server.app).post('/publications').set('Authorization', `Bearer ${blockedToken}`).field('target_id', blockerPubId).field('type', 'quote').field('content', 'blocked quote')).status).toBe(403);

    vi.spyOn(PostgresUserRepository, 'findByUsername').mockResolvedValue({ id: blocker.id, username: blocker.username, name: 'Block Owner', role: 'member', status: 'active' });
    await expect(ChatService.getOrCreatePrivateChat({ id: blocked.id, username: blocked.username, name: 'Blocked User' }, blocker.username)).rejects.toThrow('mensajes');
    await expect(MessageService.sendMessage(chatId, { id: blocked.id, username: blocked.username, name: 'Blocked User' }, 'hola')).rejects.toThrow('mensajes');

    const unblockRes = await request(server.app).delete(`/members/${blocked.username}/block`).set('Authorization', `Bearer ${blockerToken}`);
    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.blocked).toBe(false);
    expect((await request(server.app).post(`/follows/${blocker.username}`).set('Authorization', `Bearer ${blockedToken}`)).status).toBe(200);
  });
});
