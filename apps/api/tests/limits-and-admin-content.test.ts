import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';

const png32 = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  (() => { const b = Buffer.alloc(25); b.writeUInt32BE(13, 0); b.write('IHDR', 4, 'ascii'); b.writeUInt32BE(32, 8); b.writeUInt32BE(32, 12); return b; })(),
  Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0]),
]);

describe('Emote Per-User Cap & Content Length Limits', () => {
  const server = new Server(5019);
  const member = { id: '019e6d84-f119-7088-8e10-5d287b356001', username: 'limit_member', email: 'lm@test.com', role: 'member' as const };
  const other = { id: '019e6d84-f119-7088-8e10-5d287b356002', username: 'limit_other', email: 'lo@test.com', role: 'member' as const };
  const admin = { id: '019e6d84-f119-7088-8e10-5d287b356003', username: 'limit_admin', email: 'la@test.com', role: 'admin' as const };
  const tokens = {
    member: TokenService.generateAccessToken(member),
    other: TokenService.generateAccessToken(other),
    admin: TokenService.generateAccessToken(admin),
  };
  let chatMemberOtherId = '';
  let chatAdminMemberId = '';

  beforeAll(async () => {
    const dbRoles = new Map([[member.id, 'member'], [other.id, 'member'], [admin.id, 'admin']]);
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => ({ ...p, role: (dbRoles.get(p.id) || p.role) as any }));
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: member.id, username: member.username, name: 'Limit Member', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: other.id, username: other.username, name: 'Limit Other', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: admin.id, username: admin.username, name: 'Limit Admin', role: 'admin' });
    chatMemberOtherId = uuidv7();
    chatAdminMemberId = uuidv7();
    await MongoChatRepository.createPrivateChat(chatMemberOtherId, { id: member.id, user_id: member.id, username: member.username, name: 'M', icon_url: null }, { id: other.id, user_id: other.id, username: other.username, name: 'O', icon_url: null });
    await MongoChatRepository.createPrivateChat(chatAdminMemberId, { id: admin.id, user_id: admin.id, username: admin.username, name: 'A', icon_url: null }, { id: member.id, user_id: member.id, username: member.username, name: 'M', icon_url: null });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const ids = [member.id, other.id, admin.id].flatMap((id) => MongoIdHelper.idVariants(id));
    await db.collection('emotes').deleteMany({ creator_id: { $in: ids } });
    await db.collection('publications').deleteMany({ 'author.id': { $in: ids } });
    await db.collection('messages').deleteMany({ sender_id: { $in: ids } });
    await db.collection('chats').deleteMany({ participant_ids: { $in: ids } });
    await db.collection('members').deleteMany({ id: { $in: ids } });
    await MongoDatabase.close();
  });

  it('caps custom emotes at 12 per user while allowing other users to upload', async () => {
    for (let i = 1; i <= 12; i++) {
      const res = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${tokens.member}`)
        .field('name', `lim_em_${i}`).attach('image', png32, { filename: 'e.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
    }
    const thirteenth = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${tokens.member}`)
      .field('name', 'lim_em_13').attach('image', png32, { filename: 'e.png', contentType: 'image/png' });
    expect(thirteenth.status).toBe(400);

    const otherEmote = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${tokens.other}`)
      .field('name', 'lim_other_1').attach('image', png32, { filename: 'e.png', contentType: 'image/png' });
    expect(otherEmote.status).toBe(201);
  });

  it('allows 1024 chars for members, rejects 1025, and allows unlimited for authenticated admins', async () => {
    const okPost = await request(server.app).post('/publications').set('Authorization', `Bearer ${tokens.member}`).field('content', 'a'.repeat(1024));
    expect(okPost.status).toBe(201);
    const badPost = await request(server.app).post('/publications').set('Authorization', `Bearer ${tokens.member}`).field('content', 'a'.repeat(1025));
    expect(badPost.status).toBe(400);
    const adminPost = await request(server.app).post('/publications').set('Authorization', `Bearer ${tokens.admin}`).field('content', 'a'.repeat(2500));
    expect(adminPost.status).toBe(201);

    const okMsg = await request(server.app).post('/chats/messages').set('Authorization', `Bearer ${tokens.member}`).send({ chat_id: chatMemberOtherId, content: 'b'.repeat(1024) });
    expect(okMsg.status).toBe(201);
    const badMsg = await request(server.app).post('/chats/messages').set('Authorization', `Bearer ${tokens.member}`).send({ chat_id: chatMemberOtherId, content: 'b'.repeat(1025) });
    expect(badMsg.status).toBe(400);
    const adminMsg = await request(server.app).post('/chats/messages').set('Authorization', `Bearer ${tokens.admin}`).send({ chat_id: chatAdminMemberId, content: 'b'.repeat(2500) });
    expect(adminMsg.status).toBe(201);
  });
});
