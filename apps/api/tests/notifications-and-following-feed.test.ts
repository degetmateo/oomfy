import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoPublicationFeedHelper } from '../src/infrastructure/repositories/mongo/MongoPublicationFeedHelper.js';
import { MongoFollowRepository } from '../src/infrastructure/repositories/mongo/MongoFollowRepository.js';
import { QueryPublicationService } from '../src/services/publications/QueryPublicationService.js';

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

  it('GET /notifications attaches target_publication for comment, quote, and mention', async () => {
    const replyPub: any = {
      id: 'pub-reply-1',
      author: { id: 'u-s1', username: 'sender1', name: 'Sender 1', role: 'member', icon_url: null, banner_url: null },
      type: 'reply',
      content: 'Buena publicación!',
      created_at: new Date().toISOString(),
      upvotes_count: 2, shares_count: 0, quotes_count: 0, comments_count: 0, is_upvoted: true,
    };

    vi.spyOn(MongoNotificationRepository, 'listByRecipient').mockResolvedValue([
      {
        id: 'n-reply', recipient_id: viewerId, sender: replyPub.author, type: 'comment',
        target_publication_id: 'pub-reply-1', status: 'pending', created_at: new Date().toISOString(),
      },
      {
        id: 'n-like', recipient_id: viewerId, sender: replyPub.author, type: 'upvote',
        target_publication_id: 'my-own-post', status: 'seen', created_at: new Date().toISOString(),
      },
    ]);
    vi.spyOn(MongoNotificationRepository, 'countPending').mockResolvedValue(1);
    const findManySpy = vi.spyOn(MongoPublicationRepository, 'findManyByIds').mockResolvedValue([replyPub]);

    const res = await request(server.app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(findManySpy).toHaveBeenCalledWith(['pub-reply-1'], viewerId);
    expect(res.body.data.notifications[0].target_publication?.content).toBe('Buena publicación!');
    expect(res.body.data.notifications[0].target_publication?.is_upvoted).toBe(true);
    expect(res.body.data.notifications[1].target_publication).toBeUndefined();
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
