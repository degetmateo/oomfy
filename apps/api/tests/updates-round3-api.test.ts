import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../src/infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoBlockRepository } from '../src/infrastructure/repositories/mongo/MongoBlockRepository.js';
import { MongoBookmarkRepository } from '../src/infrastructure/repositories/mongo/MongoBookmarkRepository.js';
import { ChatService } from '../src/services/chat/ChatService.js';
import { MessageService } from '../src/services/chat/MessageService.js';
import { NotificationService } from '../src/services/notifications/NotificationService.js';
import { PublicationInteractionDecorator } from '../src/infrastructure/repositories/mongo/PublicationInteractionDecorator.js';

describe('Round 3 Updates API (Notifs Pagination, Remove Follower, Share Pub DM, Bookmarks)', () => {
  const server = new Server(5031);
  const viewerId = '019e6d84-f119-7088-8e10-5d287b359101';
  const otherId = '019e6d84-f119-7088-8e10-5d287b359102';
  const pubId1 = '019e6d84-f119-7088-8e10-5d287b359201';
  const pubId2 = '019e6d84-f119-7088-8e10-5d287b359202';
  const folderId = '019e6d84-f119-7088-8e10-5d287b359301';

  const token = TokenService.generateAccessToken({
    id: viewerId,
    username: 'alice',
    email: 'alice@test.com',
    role: 'member',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
  });

  it('NotificationService.getNotifications returns hasMore & nextCursor even when raw grouped notifications collapse below pageSize, and up to 8 actors', async () => {
    const mkActor = (idx: number) => ({
      id: `actor-${idx}`,
      username: `user${idx}`,
      name: `User ${idx}`,
      role: 'member' as const,
      icon_url: null,
      banner_url: null,
    });
    const batch1 = Array.from({ length: 21 }, (_, idx) => ({
      id: `n-${idx + 1}`,
      recipient_id: viewerId,
      sender: mkActor(idx),
      type: 'upvote' as const,
      target_publication_id: pubId1,
      status: 'seen' as const,
      created_at: new Date(Date.now() - idx * 1000).toISOString(),
    }));
    const batch2 = [
      {
        id: 'n-older-1',
        recipient_id: viewerId,
        sender: mkActor(99),
        type: 'follow' as const,
        target_publication_id: null,
        status: 'seen' as const,
        created_at: new Date(Date.now() - 90_000).toISOString(),
      },
    ];

    const listSpy = vi
      .spyOn(MongoNotificationRepository, 'listByRecipient')
      .mockResolvedValueOnce(batch1 as any)
      .mockResolvedValueOnce(batch2 as any);
    vi.spyOn(MongoNotificationRepository, 'countPending').mockResolvedValue(0);
    vi.spyOn(MongoPublicationRepository, 'findManyByIds').mockResolvedValue([]);

    const result = await NotificationService.getNotifications(viewerId, 20, null);
    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].actors?.length).toBe(8);
    expect(result.notifications[0].actors_count).toBe(20);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('MongoNotificationRepository.listByRecipient returns [] when older_id cursor does not exist and uses tie-breaker filter when it does', async () => {
    const findOne = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
      _id: 'cursor-bin',
      created_at: '2026-01-01T00:00:00.000Z',
    });
    const toArray = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ toArray });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: () => ({ findOne, find }) } as any);

    const missing = await MongoNotificationRepository.listByRecipient(viewerId, 20, 'nonexistent-cursor');
    expect(missing).toEqual([]);
    expect(find).not.toHaveBeenCalled();

    await MongoNotificationRepository.listByRecipient(viewerId, 20, 'valid-cursor');
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      $or: [
        { created_at: { $lt: '2026-01-01T00:00:00.000Z' } },
        { created_at: '2026-01-01T00:00:00.000Z', _id: { $lt: 'cursor-bin' } },
      ],
    }));
    expect(sort).toHaveBeenCalledWith({ created_at: -1, _id: -1 });
  });

  it('DELETE /follows/followers/:username removes follower, decrements counters, and blocks self-removal', async () => {
    vi.spyOn(MongoMemberRepository, 'findByUsername').mockImplementation(async (u) =>
      u === 'alice'
        ? { id: viewerId, username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null } as any
        : { id: otherId, username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null } as any
    );
    const unfollowSpy = vi.spyOn(MongoFollowRepository, 'unfollow').mockResolvedValue(true);
    const incSpy = vi.spyOn(MongoMemberRepository, 'incrementCounters').mockResolvedValue(undefined);

    const selfRes = await request(server.app).delete('/follows/followers/alice').set('Authorization', `Bearer ${token}`);
    expect(selfRes.status).toBe(400);

    const res = await request(server.app).delete('/follows/followers/bob').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(true);
    expect(unfollowSpy).toHaveBeenCalledWith(otherId, viewerId);
    expect(incSpy).toHaveBeenCalledWith(otherId, { followed_count: -1 });
    expect(incSpy).toHaveBeenCalledWith(viewerId, { follower_count: -1 });
  });

  it('POST /chats/share-publication sends publication to multiple recipients with optional message text', async () => {
    const samplePub: any = {
      id: pubId1,
      author: { id: otherId, username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: 'Publicación interesante',
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      upvotes_count: 1,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
    };
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue(samplePub);
    vi.spyOn(MongoBlockRepository, 'isBlockedEitherWay').mockResolvedValue(false);
    const chatSpy = vi
      .spyOn(ChatService, 'getOrCreatePrivateChat')
      .mockResolvedValueOnce({ id: 'chat-bob', isNew: false })
      .mockResolvedValueOnce({ id: 'chat-carol', isNew: true });
    const sendSpy = vi
      .spyOn(MessageService, 'sendMessage')
      .mockResolvedValueOnce({ id: 'msg-1', chat_id: 'chat-bob' } as any)
      .mockResolvedValueOnce({ id: 'msg-2', chat_id: 'chat-carol' } as any);

    const res = await request(server.app)
      .post('/chats/share-publication')
      .set('Authorization', `Bearer ${token}`)
      .send({
        publication_id: pubId1,
        recipient_usernames: ['bob', 'carol', 'BOB'],
        content: 'Mira esto',
      });

    expect(res.status).toBe(201);
    expect(chatSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenNthCalledWith(1, 'chat-bob', expect.objectContaining({ id: viewerId }), {
      content: 'Mira esto',
      shared_publication_id: pubId1,
    });
    expect(res.body.data.sent).toHaveLength(2);
  });

  it('Bookmarks CRUD, folder management, reordering, and PublicationInteractionDecorator.is_bookmarked', async () => {
    const samplePub: any = {
      id: pubId1,
      author: { id: otherId, username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: 'Post para guardar',
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
    };
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue(samplePub);
    vi.spyOn(MongoBlockRepository, 'isBlockedEitherWay').mockResolvedValue(false);
    vi.spyOn(MongoBookmarkRepository, 'countFolders').mockResolvedValue(0);
    vi.spyOn(MongoBookmarkRepository, 'createFolder').mockResolvedValue({
      id: folderId, user_id: viewerId, name: 'Arte Pixel', position: 0, items_count: 0,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    });
    vi.spyOn(MongoBookmarkRepository, 'findFolderById').mockResolvedValue({
      id: folderId, user_id: viewerId, name: 'Arte Pixel', position: 0, items_count: 1,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    });
    vi.spyOn(MongoBookmarkRepository, 'upsertBookmark').mockResolvedValue({
      id: 'bm-1', user_id: viewerId, publication_id: pubId1, folder_id: folderId, position: 0,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    });
    const reorderSpy = vi.spyOn(MongoBookmarkRepository, 'reorderBookmarks').mockResolvedValue(undefined);
    vi.spyOn(MongoBookmarkRepository, 'deleteFolder').mockResolvedValue(true);

    const createFolderRes = await request(server.app)
      .post('/bookmarks/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Arte Pixel' });
    expect(createFolderRes.status).toBe(201);
    expect(createFolderRes.body.data.name).toBe('Arte Pixel');

    const saveRes = await request(server.app)
      .post('/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ publication_id: pubId1, folder_id: folderId });
    expect(saveRes.status).toBe(201);
    expect(saveRes.body.data.folder_id).toBe(folderId);
    expect(saveRes.body.data.publication.is_bookmarked).toBe(true);

    const reorderRes = await request(server.app)
      .put('/bookmarks/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ folder_id: folderId, ordered_publication_ids: [pubId2, pubId1] });
    expect(reorderRes.status).toBe(200);
    expect(reorderSpy).toHaveBeenCalledWith(viewerId, folderId, [pubId2, pubId1]);

    const delFolderRes = await request(server.app)
      .delete(`/bookmarks/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delFolderRes.status).toBe(200);
    expect(delFolderRes.body.deleted).toBe(true);

    // Verify PublicationInteractionDecorator marks is_bookmarked
    const collectionSpy = vi.fn((name: string) => ({
      find: () => ({
        toArray: async () => (name === 'bookmarks' ? [{ publication_id: pubId1 }] : []),
      }),
    }));
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: collectionSpy } as any);
    const [decorated] = await PublicationInteractionDecorator.decorate([{ ...samplePub }], viewerId);
    expect(decorated.is_bookmarked).toBe(true);
  });
});
