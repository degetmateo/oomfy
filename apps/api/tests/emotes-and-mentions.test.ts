import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../src/infrastructure/repositories/mongo/MongoBlockRepository.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';

const makePng = (w: number, h: number): Buffer => {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); ihdr.write('IHDR', 4, 'ascii');
  ihdr.writeUInt32BE(w, 8); ihdr.writeUInt32BE(h, 12);
  return Buffer.concat([sig, ihdr, Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0])]);
};

describe('Custom Emotes & Mention Notifications', () => {
  const server = new Server(5018);
  const author = { id: '019e6d84-f119-7088-8e10-5d287b355001', username: 'emote_author', email: 'ea@test.com', role: 'member' as const };
  const target = { id: '019e6d84-f119-7088-8e10-5d287b355002', username: 'target_mention_user', email: 'tm@test.com', role: 'member' as const };
  const blocked = { id: '019e6d84-f119-7088-8e10-5d287b355003', username: 'blocked_mention_user', email: 'bm@test.com', role: 'member' as const };
  const authorToken = TokenService.generateAccessToken(author);
  const targetToken = TokenService.generateAccessToken(target);

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (payload) => payload);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: author.id, username: author.username, name: 'Emote Author', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: target.id, username: target.username, name: 'Target User', role: 'member' });
    await MongoMemberRepository.createOrUpdate({ id: blocked.id, username: blocked.username, name: 'Blocked User', role: 'member' });
    await MongoBlockRepository.block(author.id, blocked.id);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const ids = [author.id, target.id, blocked.id].flatMap((id) => MongoIdHelper.idVariants(id));
    await db.collection('emotes').deleteMany({ $or: [{ creator_id: { $in: ids } }, { name_lower: 'emote_test_ok' }] });
    await db.collection('publications').deleteMany({ 'author.id': { $in: ids } });
    await db.collection('notifications').deleteMany({ $or: [{ recipient_id: { $in: ids } }, { 'sender.id': { $in: ids } }] });
    await db.collection('blocks').deleteMany({ $or: [{ blocker_id: { $in: ids } }, { blocked_id: { $in: ids } }] });
    await db.collection('members').deleteMany({ $or: [{ id: { $in: ids } }, { username: { $in: [author.username, target.username, blocked.username] } }] });
    await MongoDatabase.close();
  });

  it('validates, creates, lists, and deletes custom emotes with ownership enforcement', async () => {
    const badName = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${authorToken}`)
      .field('name', 'bad name!').attach('image', makePng(32, 32), { filename: 'ok.png', contentType: 'image/png' });
    expect(badName.status).toBe(400);
    const bigDim = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${authorToken}`)
      .field('name', 'big_dim').attach('image', makePng(512, 512), { filename: 'big.png', contentType: 'image/png' });
    expect(bigDim.status).toBe(400);
    const created = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${authorToken}`)
      .field('name', 'emote_test_ok').attach('image', makePng(32, 32), { filename: 'ok.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    const emoteId = created.body.data.id;
    const dup = await request(server.app).post('/settings/emotes').set('Authorization', `Bearer ${authorToken}`)
      .field('name', 'EMOTE_TEST_OK').attach('image', makePng(32, 32), { filename: 'ok.png', contentType: 'image/png' });
    expect(dup.status).toBe(409);
    const listed = await request(server.app).get('/aux/emotes');
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((e: any) => e.id === emoteId && e.name === 'emote_test_ok')).toBe(true);
    const delOther = await request(server.app).delete(`/settings/emotes/${emoteId}`).set('Authorization', `Bearer ${targetToken}`);
    expect(delOther.status).toBe(403);
    const imported = await request(server.app).post(`/settings/emotes/${emoteId}/import`).set('Authorization', `Bearer ${targetToken}`);
    expect(imported.status).toBe(201);
    expect(imported.body.data.creator_id).toBe(target.id);
    const delImported = await request(server.app).delete(`/settings/emotes/${imported.body.data.id}`).set('Authorization', `Bearer ${targetToken}`);
    expect(delImported.status).toBe(200);
    const delOwner = await request(server.app).delete(`/settings/emotes/${emoteId}`).set('Authorization', `Bearer ${authorToken}`);
    expect(delOwner.status).toBe(200);
  });

  it('dispatches in-app and push mention notifications while respecting blocks', async () => {
    const pushSpy = vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(1);
    const pubRes = await request(server.app).post('/publications').set('Authorization', `Bearer ${authorToken}`)
      .field('content', `Hola @${target.username} y @${blocked.username} :emote_test_ok:`);
    expect(pubRes.status).toBe(201);
    const pubId = pubRes.body.data.id;

    const db = MongoDatabase.getDb();
    const targetNotif = await db.collection('notifications').findOne({ recipient_id: { $in: MongoIdHelper.idVariants(target.id) }, type: 'mention' });
    const blockedNotif = await db.collection('notifications').findOne({ recipient_id: { $in: MongoIdHelper.idVariants(blocked.id) }, type: 'mention' });

    expect(targetNotif).toBeTruthy();
    expect(String(targetNotif?.target_publication_id)).toBe(pubId);
    expect(blockedNotif).toBeNull();
    expect(pushSpy).toHaveBeenCalledWith(target.id, expect.objectContaining({ url: `/publication/${pubId}` }), 'mentions');
  });
});
