import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';

describe('Dynamic Thread Previews & Inline Sub-Threads API', () => {
  const server = new Server(5021);
  const authorId = '019e6d84-f119-7088-8e10-5d287b399001';
  const replierId = '019e6d84-f119-7088-8e10-5d287b399002';
  const authorToken = TokenService.generateAccessToken({ id: authorId, username: 'thread_author_1', email: 'ta@test.com', role: 'member' });
  const replierToken = TokenService.generateAccessToken({ id: replierId, username: 'thread_replier_1', email: 'tr@test.com', role: 'member' });

  const createPost = (token: string, content: string, targetId?: string) =>
    request(server.app).post('/publications').set('Authorization', `Bearer ${token}`)
      .send(targetId ? { content, type: 'reply', target_id: targetId } : { content });

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (payload) => payload);
    await MongoDatabase.connect();
    await MongoMemberRepository.createOrUpdate({ id: authorId, username: 'thread_author_1', name: 'Thread Author' });
    await MongoMemberRepository.createOrUpdate({ id: replierId, username: 'thread_replier_1', name: 'Thread Replier' });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const idVars = [...MongoIdHelper.idVariants(authorId), ...MongoIdHelper.idVariants(replierId)];
    await db.collection('notifications').deleteMany({ $or: [{ recipient_id: { $in: idVars } }, { sender_id: { $in: idVars } }] });
    await db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: idVars } }, { 'author.username': { $in: ['thread_author_1', 'thread_replier_1'] } }] });
    await db.collection('members').deleteMany({ $or: [{ id: { $in: idVars } }, { username: { $in: ['thread_author_1', 'thread_replier_1'] } }] });
    await MongoDatabase.close();
  });

  it('attaches author self-thread preview (up to 2) in feeds and paginates remaining replies', async () => {
    const p0 = (await createPost(authorToken, 'Root thread post 0')).body.data;
    const p1 = (await createPost(authorToken, 'Author continuation 1', p0.id)).body.data;
    const p2 = (await createPost(authorToken, 'Author continuation 2', p1.id)).body.data;
    const p3 = (await createPost(authorToken, 'Author continuation 3', p2.id)).body.data;

    const feedRes = await request(server.app).get('/publications?author_username=thread_author_1&type=posts&limit=10');
    expect(feedRes.status).toBe(200);
    const rootItem = feedRes.body.data.find((x: any) => x.id === p0.id);
    expect(rootItem.author_thread_preview.map((x: any) => x.id)).toEqual([p1.id, p2.id]);
    expect(rootItem.author_thread_remaining_count).toBe(1);

    const moreRes = await request(server.app).get(`/publications/${p0.id}/subthread?mode=author&offset=2&limit=5`);
    expect(moreRes.status).toBe(200);
    expect(moreRes.body.data.items.map((x: any) => x.id)).toEqual([p3.id]);
    expect(moreRes.body.data.remaining).toBe(0);
    expect(moreRes.body.data.has_more).toBe(false);
  });

  it('returns prioritized inline subthreads with author-reply highlight and pagination on detail', async () => {
    const root = (await createPost(authorToken, 'Discussion root post')).body.data;
    const plainReply = (await createPost(replierToken, 'Earlier plain reply', root.id)).body.data;
    const hotReply = (await createPost(replierToken, 'Reply that author answers', root.id)).body.data;
    const sub1 = (await createPost(authorToken, 'Original author answers here', hotReply.id)).body.data;
    const sub2 = (await createPost(replierToken, 'Replier follow-up', sub1.id)).body.data;
    const sub3 = (await createPost(replierToken, 'Deep subthread reply 3', sub2.id)).body.data;

    const detailRes = await request(server.app).get(`/publications/${root.id}`);
    expect(detailRes.status).toBe(200);
    const replies = detailRes.body.data.replies;
    expect(replies[0].id).toBe(hotReply.id);
    expect(replies[0].has_author_reply).toBe(true);
    expect(replies[0].subthread_preview.map((x: any) => x.id)).toEqual([sub1.id, sub2.id]);
    expect(replies[0].subthread_remaining_count).toBe(1);
    expect(replies[1].id).toBe(plainReply.id);

    const moreRes = await request(server.app).get(`/publications/${hotReply.id}/subthread?mode=subthread&offset=2&limit=5`);
    expect(moreRes.status).toBe(200);
    expect(moreRes.body.data.items.map((x: any) => x.id)).toEqual([sub3.id]);
    expect(moreRes.body.data.remaining).toBe(0);
    expect(moreRes.body.data.has_more).toBe(false);
  });
});
