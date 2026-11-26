import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoMigrationRunner } from '../src/infrastructure/database/mongo/MongoMigrationRunner.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';

describe('Bookmarks Real MongoDB Integration', () => {
  const server = new Server(5034);
  const user = {
    id: '019e6d84-f119-7088-8e10-5d287b359901',
    username: 'bm_tester',
    email: 'bm@test.com',
    role: 'member' as const,
  };
  const token = TokenService.generateAccessToken(user);

  beforeAll(async () => {
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (payload) => payload);
    await MongoDatabase.connect();
    await MongoMigrationRunner.ensureIndexes();
    await MongoMemberRepository.createOrUpdate({
      id: user.id,
      username: user.username,
      name: 'Bookmark Tester',
      role: 'member',
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const db = MongoDatabase.getDb();
    const uVars = MongoIdHelper.idVariants(user.id);
    await Promise.all([
      db.collection('bookmarks').deleteMany({ user_id: { $in: uVars } }),
      db.collection('bookmark_folders').deleteMany({ user_id: { $in: uVars } }),
      db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: uVars } }, { 'author.username': user.username }] }),
      db.collection('members').deleteMany({ $or: [{ id: { $in: uVars } }, { username: user.username }] }),
    ]);
    await MongoDatabase.close();
  });

  it('supports folders CRUD, saving posts, listing, decorating is_bookmarked, moving, reordering, and deleting folders end-to-end', async () => {
    const [p1, p2] = await Promise.all([
      request(server.app).post('/publications').set('Authorization', `Bearer ${token}`).field('content', 'Bookmark post 1'),
      request(server.app).post('/publications').set('Authorization', `Bearer ${token}`).field('content', 'Bookmark post 2'),
    ]);
    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);
    const pubId1 = p1.body.data.id;
    const pubId2 = p2.body.data.id;

    // Create folder & check duplicate 409
    const folderRes = await request(server.app)
      .post('/bookmarks/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Inspiración' });
    expect(folderRes.status).toBe(201);
    const folderId = folderRes.body.data.id;

    const dupRes = await request(server.app)
      .post('/bookmarks/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'inspiración' });
    expect(dupRes.status).toBe(409);

    // Save both publications
    const save1 = await request(server.app)
      .post('/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ publication_id: pubId1 });
    const save2 = await request(server.app)
      .post('/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ publication_id: pubId2 });
    expect(save1.status).toBe(201);
    expect(save2.status).toBe(201);

    // Feed marks both as is_bookmarked
    const feedRes = await request(server.app)
      .get(`/publications?author_username=${user.username}&limit=10`)
      .set('Authorization', `Bearer ${token}`);
    expect(feedRes.status).toBe(200);
    const bookmarkedMap = new Map((feedRes.body.data as any[]).map((item) => [item.id, item.is_bookmarked]));
    expect(bookmarkedMap.get(pubId1)).toBe(true);
    expect(bookmarkedMap.get(pubId2)).toBe(true);

    // Move both to folder and verify items_count
    const move1 = await request(server.app)
      .patch(`/bookmarks/${pubId1}/folder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ folder_id: folderId });
    const move2 = await request(server.app)
      .patch(`/bookmarks/${pubId2}/folder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ folder_id: folderId });
    expect(move1.status).toBe(200);
    expect(move2.status).toBe(200);

    const foldersList = await request(server.app)
      .get('/bookmarks/folders')
      .set('Authorization', `Bearer ${token}`);
    expect(foldersList.status).toBe(200);
    expect(foldersList.body.data[0].items_count).toBe(2);

    // Reorder inside folder and verify persisted order
    const reorderRes = await request(server.app)
      .put('/bookmarks/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ folder_id: folderId, ordered_publication_ids: [pubId1, pubId2] });
    expect(reorderRes.status).toBe(200);

    const folderItemsRes = await request(server.app)
      .get(`/bookmarks?folder_id=${folderId}&limit=20&offset=0`)
      .set('Authorization', `Bearer ${token}`);
    expect(folderItemsRes.status).toBe(200);
    expect(folderItemsRes.body.data.items.map((x: any) => x.publication_id)).toEqual([pubId1, pubId2]);

    // Reverse order and verify again
    await request(server.app)
      .put('/bookmarks/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ folder_id: folderId, ordered_publication_ids: [pubId2, pubId1] });
    const folderItemsReversed = await request(server.app)
      .get(`/bookmarks?folder_id=${folderId}&limit=20&offset=0`)
      .set('Authorization', `Bearer ${token}`);
    expect(folderItemsReversed.body.data.items.map((x: any) => x.publication_id)).toEqual([pubId2, pubId1]);

    // Rename & delete folder (saved posts remain in unfiled)
    const renameRes = await request(server.app)
      .patch(`/bookmarks/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Favoritos Visuales' });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.data.name).toBe('Favoritos Visuales');

    const delFolderRes = await request(server.app)
      .delete(`/bookmarks/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delFolderRes.status).toBe(200);

    const unfiledRes = await request(server.app)
      .get('/bookmarks?folder_id=unfiled&limit=20&offset=0')
      .set('Authorization', `Bearer ${token}`);
    expect(unfiledRes.status).toBe(200);
    expect(unfiledRes.body.data.items).toHaveLength(2);

    // Remove one bookmark
    const delBm = await request(server.app)
      .delete(`/bookmarks/${pubId1}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delBm.status).toBe(200);
    expect(delBm.body.removed).toBe(true);
  }, 15_000);
});
