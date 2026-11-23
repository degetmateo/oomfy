import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoPublicationFeedHelper } from '../src/infrastructure/repositories/mongo/MongoPublicationFeedHelper.js';
import { MongoFollowRepository } from '../src/infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoBlockRepository } from '../src/infrastructure/repositories/mongo/MongoBlockRepository.js';
import { QueryPublicationService } from '../src/services/publications/QueryPublicationService.js';
import { UpvoteService } from '../src/services/interactions/UpvoteService.js';
import { ShareService } from '../src/services/interactions/ShareService.js';
import { NotificationDispatcher } from '../src/services/notifications/NotificationDispatcher.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';

describe('Notifications Embedded Publications & Following Feed', () => {
  const server = new Server(5022);
  const viewerId = '019e6d84-f119-7088-8e10-5d287b358001';
  const token = TokenService.generateAccessToken({
    id: viewerId,
    username: 'notif_viewer',
    email: 'nv@test.com',
    role: 'member',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthSessionValidator, 'validate').mockImplementation(async (p) => p);
  });

  it('GET /notifications batches target_publication hydration for comment, quote, mention, upvote, and share while skipping follow', async () => {
    const sender = { id: 'u-s1', username: 'sender1', name: 'Sender 1', role: 'member' as const, icon_url: null, banner_url: null };
    const replyPub: any = {
      id: 'pub-reply-1',
      author: sender,
      type: 'reply',
      content: 'Buena publicación!',
      created_at: new Date().toISOString(),
      upvotes_count: 2, shares_count: 0, quotes_count: 0, comments_count: 0, is_upvoted: true,
    };
    const likedPub: any = {
      id: 'my-own-post',
      author: { id: viewerId, username: 'notif_viewer', name: 'Viewer', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: 'Publicación con texto largo para probar extracto',
      created_at: new Date().toISOString(),
      upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 0,
    };
    const sharedImagePub: any = {
      id: 'my-image-post',
      author: { id: viewerId, username: 'notif_viewer', name: 'Viewer', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: null,
      images: [{ url: 'https://i.ibb.co/sample.png', source: 'imgbb', index: 0 }],
      created_at: new Date().toISOString(),
      upvotes_count: 0, shares_count: 1, quotes_count: 0, comments_count: 0,
    };

    vi.spyOn(MongoNotificationRepository, 'listByRecipient').mockResolvedValue([
      {
        id: 'n-reply', recipient_id: viewerId, sender, type: 'comment',
        target_publication_id: 'pub-reply-1', status: 'pending', created_at: new Date().toISOString(),
      },
      {
        id: 'n-like', recipient_id: viewerId, sender, type: 'upvote',
        target_publication_id: 'my-own-post', status: 'seen', created_at: new Date().toISOString(),
      },
      {
        id: 'n-share-img', recipient_id: viewerId, sender, type: 'share',
        target_publication_id: 'my-image-post', status: 'seen', created_at: new Date().toISOString(),
      },
      {
        id: 'n-like-deleted', recipient_id: viewerId, sender, type: 'upvote',
        target_publication_id: 'deleted-post', status: 'seen', created_at: new Date().toISOString(),
      },
      {
        id: 'n-follow', recipient_id: viewerId, sender, type: 'follow',
        target_publication_id: null, status: 'seen', created_at: new Date().toISOString(),
      },
    ]);
    vi.spyOn(MongoNotificationRepository, 'countPending').mockResolvedValue(1);
    const findManySpy = vi.spyOn(MongoPublicationRepository, 'findManyByIds').mockResolvedValue([
      replyPub,
      likedPub,
      sharedImagePub,
    ]);

    const res = await request(server.app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(findManySpy).toHaveBeenCalledWith(['pub-reply-1', 'my-own-post', 'my-image-post', 'deleted-post'], viewerId);
    expect(res.body.data.notifications[0].target_publication?.content).toBe('Buena publicación!');
    expect(res.body.data.notifications[0].target_publication?.is_upvoted).toBe(true);
    expect(res.body.data.notifications[1].target_publication?.content).toBe('Publicación con texto largo para probar extracto');
    expect(res.body.data.notifications[2].target_publication?.images?.[0]?.url).toBe('https://i.ibb.co/sample.png');
    expect(res.body.data.notifications[3].target_publication).toBeNull();
    expect(res.body.data.notifications[4].target_publication).toBeUndefined();
  });

  it('UpvoteService and ShareService include targetPublication and image URL push fallback in dispatched notifications', async () => {
    const authorId = '019e6d84-f119-7088-8e10-5d287b358088';
    const actor = { id: viewerId, username: 'actor1', name: 'Actor One', role: 'member' };
    const imageOnlyPub: any = {
      id: 'pub-img-only',
      author: { id: authorId, username: 'owner', name: 'Owner', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: null,
      images: [{ url: 'https://i.ibb.co/only-image.png', source: 'imgbb', index: 0 }],
      embeds: [],
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      upvotes_count: 2,
      shares_count: 4,
      quotes_count: 0,
      comments_count: 0,
    };

    const fakeCol = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: () => fakeCol } as any);
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue(imageOnlyPub);
    vi.spyOn(MongoPublicationRepository, 'incrementCounters').mockResolvedValue(undefined);
    vi.spyOn(MongoPublicationRepository, 'create').mockResolvedValue(imageOnlyPub);
    vi.spyOn(MongoBlockRepository, 'isBlockedEitherWay').mockResolvedValue(false);
    vi.spyOn(SocketGateway, 'broadcastPublicationInteraction').mockImplementation(() => {});
    const dispatchSpy = vi.spyOn(NotificationDispatcher, 'dispatch').mockResolvedValue(undefined);

    await UpvoteService.upvote('pub-img-only', actor);
    expect(dispatchSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: 'upvote',
      targetPublicationId: 'pub-img-only',
      targetPublication: expect.objectContaining({ id: 'pub-img-only', upvotes_count: 3 }),
      push: expect.objectContaining({ body: 'https://i.ibb.co/only-image.png' }),
    }));

    await ShareService.share('pub-img-only', actor);
    expect(dispatchSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: 'share',
      targetPublicationId: 'pub-img-only',
      targetPublication: expect.objectContaining({ id: 'pub-img-only', shares_count: 5 }),
      push: expect.objectContaining({ body: 'https://i.ibb.co/only-image.png' }),
    }));
  });

  it('MongoPublicationFeedHelper filters by followed authors on feed=following and returns empty when following none', async () => {
    const fakeCol = { find: vi.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) })) } as any;
    vi.spyOn(MongoFollowRepository, 'getFollowedUserIds').mockResolvedValueOnce([]);
    const emptyResult = await MongoPublicationFeedHelper.findFeed(fakeCol, { feed: 'following', userId: viewerId });
    expect(emptyResult).toEqual([]);
    expect(fakeCol.find).not.toHaveBeenCalled();

    vi.spyOn(MongoFollowRepository, 'getFollowedUserIds').mockResolvedValueOnce(['019e6d84-f119-7088-8e10-5d287b358099']);
    await MongoPublicationFeedHelper.findFeed(fakeCol, { feed: 'following', userId: viewerId, limit: 15 });
    expect(fakeCol.find).toHaveBeenCalledWith(expect.objectContaining({
      $and: expect.arrayContaining([
        expect.objectContaining({ $or: expect.any(Array) }),
      ]),
    }));
  });

  it('GET /publications?feed=following passes feed=following to QueryPublicationService', async () => {
    const feedSpy = vi.spyOn(QueryPublicationService, 'getFeed').mockResolvedValue([]);

    const res = await request(server.app).get('/publications?feed=following&limit=20').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(feedSpy).toHaveBeenCalledWith(expect.objectContaining({ feed: 'following', limit: 20 }), viewerId);
  });
});
