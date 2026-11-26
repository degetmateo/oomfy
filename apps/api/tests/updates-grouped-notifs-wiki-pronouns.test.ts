import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateProfileSchema } from '@oomfy/shared';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoMemberMapper } from '../src/infrastructure/repositories/mongo/MongoMemberMapper.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoBlockRepository } from '../src/infrastructure/repositories/mongo/MongoBlockRepository.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres/PostgresUserRepository.js';
import { NotificationDispatcher } from '../src/services/notifications/NotificationDispatcher.js';
import { NotificationService } from '../src/services/notifications/NotificationService.js';
import { NotificationIconHelper } from '../src/services/notifications/NotificationIconHelper.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { UpvoteService } from '../src/services/interactions/UpvoteService.js';
import { ShareService } from '../src/services/interactions/ShareService.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';
import { WikipediaEmbedAdapter } from '../src/infrastructure/adapters/WikipediaEmbedAdapter.js';
import { UrlPreviewAdapter } from '../src/infrastructure/adapters/UrlPreviewAdapter.js';
import { ProfileService } from '../src/services/users/ProfileService.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';

describe('API Updates: Grouped Notifications, Wikipedia Embeds & Profile Pronouns', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Grouped Like & Share Notifications ---
  it('upsertGroupedInteraction groups multiple actors on the same publication and cleans up legacy duplicates', async () => {
    const alice = { id: '019e6d84-f119-7088-8e10-5d287b358001', username: 'alice', name: 'Alice', role: 'member' as const, icon_url: null, banner_url: null };
    const bob = { id: '019e6d84-f119-7088-8e10-5d287b358002', username: 'bob', name: 'Bob', role: 'member' as const, icon_url: null, banner_url: null };
    const carol = { id: '019e6d84-f119-7088-8e10-5d287b358003', username: 'carol', name: 'Carol', role: 'member' as const, icon_url: null, banner_url: null };

    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const findChain = {
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'n-2', id: 'n-2', recipient_id: 'owner-1', type: 'upvote', target_publication_id: 'pub-1', sender: bob, status: 'pending', created_at: '2026-11-25T10:00:00.000Z' },
          { _id: 'n-1', id: 'n-1', recipient_id: 'owner-1', type: 'upvote', target_publication_id: 'pub-1', sender: alice, status: 'seen', created_at: '2026-11-25T09:00:00.000Z' },
        ]),
      }),
    };
    const col = { find: vi.fn().mockReturnValue(findChain), updateOne, deleteMany, insertOne: vi.fn() };
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: () => col } as any);

    const res = await MongoNotificationRepository.upsertGroupedInteraction({
      id: 'n-3',
      recipient_id: 'owner-1',
      sender: carol,
      type: 'upvote',
      target_publication_id: 'pub-1',
      status: 'pending',
      created_at: '2026-11-25T11:00:00.000Z',
    });

    expect(res.wasAlreadyPending).toBe(true);
    expect(res.notification.sender.username).toBe('carol');
    expect(res.notification.actors_count).toBe(3);
    expect(res.notification.actors?.map((a) => a.username)).toEqual(['carol', 'bob', 'alice']);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ _id: { $in: ['n-1'] } });
  });

  it('NotificationDispatcher sends grouped push titles and coalescing tag for upvote and share', async () => {
    vi.spyOn(NotificationIconHelper, 'resolveSenderIcon').mockResolvedValue('https://cdn.example.com/ava.png');
    vi.spyOn(MongoNotificationRepository, 'upsertGroupedInteraction').mockResolvedValue({
      wasAlreadyPending: false,
      notification: {
        id: 'n-g1',
        recipient_id: 'owner-1',
        sender: { id: 'u3', username: 'carol', name: 'Carol', role: 'member', icon_url: null, banner_url: null },
        actors_count: 4,
        actor_ids: ['u3', 'u2', 'u1', 'u0'],
        type: 'share',
        target_publication_id: 'pub-99',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
    const socketSpy = vi.spyOn(SocketGateway, 'sendNotification').mockImplementation(() => {});
    const pushSpy = vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(1);

    await NotificationDispatcher.dispatch({
      recipientId: 'owner-1',
      sender: { id: 'u3', username: 'carol', name: 'Carol', role: 'member' },
      type: 'share',
      targetPublicationId: 'pub-99',
      push: { title: 'Carol compartió', body: 'Post', url: '/publication/pub-99', category: 'shares' },
    });

    expect(socketSpy).toHaveBeenCalledWith('owner-1', expect.objectContaining({ actors_count: 4 }));
    expect(pushSpy).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({
        title: 'Carol y 3 más compartieron tu publicación',
        tag: 'notif-share-pub-99',
      }),
      'shares'
    );
  });

  it('NotificationService.collapseGroupedNotifications collapses legacy ungrouped upvote/share rows and UpvoteService/ShareService remove actor on undo', async () => {
    const collapsed = NotificationService.collapseGroupedNotifications([
      {
        id: 'n2', recipient_id: 'owner-1', type: 'upvote', target_publication_id: 'p1',
        sender: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
        status: 'pending', created_at: '2026-11-25T10:00:00Z',
      },
      {
        id: 'n1', recipient_id: 'owner-1', type: 'upvote', target_publication_id: 'p1',
        sender: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
        status: 'seen', created_at: '2026-11-25T09:00:00Z',
      },
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].actors_count).toBe(2);
    expect(collapsed[0].status).toBe('pending');

    const fakeCol = { deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }) };
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: () => fakeCol } as any);
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue({
      id: 'p1', author: { id: 'owner-1', username: 'owner', name: 'Owner', role: 'member', icon_url: null, banner_url: null },
      type: 'default', content: 'hi', created_at: new Date().toISOString(), parent_publication_id: null, root_publication_id: null,
      upvotes_count: 2, shares_count: 2, quotes_count: 0, comments_count: 0,
    });
    vi.spyOn(MongoPublicationRepository, 'incrementCounters').mockResolvedValue(undefined);
    vi.spyOn(SocketGateway, 'broadcastPublicationInteraction').mockImplementation(() => {});
    const removeSpy = vi.spyOn(MongoNotificationRepository, 'removeActorFromGroup').mockResolvedValue(undefined);

    await UpvoteService.downvote('p1', 'u2');
    await ShareService.unshare('p1', 'u2');
    expect(removeSpy).toHaveBeenCalledWith('owner-1', 'upvote', 'p1', 'u2');
    expect(removeSpy).toHaveBeenCalledWith('owner-1', 'share', 'p1', 'u2');
  });

  // --- Wikipedia Embeds ---
  it('WikipediaEmbedAdapter fetches Wikimedia REST summary, rejects special namespaces, and wires through UrlPreviewAdapter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        titles: { normalized: 'Ada Lovelace' },
        description: 'Matemática y escritora británica',
        extract: 'Augusta Ada King, condesa de Lovelace, fue una matemática y escritora británica.',
        thumbnail: { source: 'http://upload.wikimedia.org/wikipedia/commons/thumb/ada.jpg' },
      }), { status: 200 })
    );

    const wiki = await UrlPreviewAdapter.getPreview('https://es.m.wikipedia.org/wiki/Ada_Lovelace');
    expect(wiki).toEqual({
      type: 'wikipedia',
      url: 'https://es.m.wikipedia.org/wiki/Ada_Lovelace',
      title: 'Ada Lovelace',
      article_description: 'Matemática y escritora británica',
      description: 'Augusta Ada King, condesa de Lovelace, fue una matemática y escritora británica.',
      thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/ada.jpg',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/ada.jpg',
      site_name: 'Wikipedia',
      language: 'es',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://es.wikipedia.org/api/rest_v1/page/summary/Ada_Lovelace',
      expect.any(Object)
    );

    expect(await WikipediaEmbedAdapter.fetchArticle('https://es.wikipedia.org/wiki/Especial:Buscar')).toBeNull();
    expect(await WikipediaEmbedAdapter.fetchArticle('https://en.wikipedia.org/wiki/File:Example.png')).toBeNull();
  });

  // --- Profile Pronouns ---
  it('validates and persists profile pronouns in UpdateProfileSchema, ProfileService, and MongoMemberMapper', async () => {
    expect(UpdateProfileSchema.parse({ pronouns: '  he/him  ' }).pronouns).toBe('he/him');
    expect(UpdateProfileSchema.parse({ pronouns: '   ' }).pronouns).toBeNull();
    expect(() => UpdateProfileSchema.parse({ pronouns: 'x'.repeat(33) })).toThrow();

    const queryMock = vi.fn().mockResolvedValue({ rows: [] });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    vi.spyOn(SystemSettingsService, 'getSettings').mockResolvedValue({ disable_profile_editing: false } as any);
    vi.spyOn(PostgresUserRepository, 'findById').mockResolvedValue({
      id: 'u-pron', username: 'puser', name: 'P User', email: 'p@oomfy.online', role: 'member',
      status: 'active', bio: null, pronouns: null, location: null, link: null, created_at: new Date().toISOString(),
    });
    const createOrUpdateSpy = vi.spyOn(MongoMemberRepository, 'createOrUpdate').mockResolvedValue();
    vi.spyOn(UserSyncService, 'enqueueProfileSync').mockImplementation(() => {});
    vi.spyOn(MongoMemberRepository, 'findById').mockResolvedValue({
      id: 'u-pron', username: 'puser', name: 'P User', role: 'member', bio: null, pronouns: 'they/them',
      location: null, link: null, icon_url: null, banner_url: null, created_at: new Date().toISOString(),
      follower_count: 0, followed_count: 0, publication_count: 0,
    });

    const updated = await ProfileService.updateProfile('u-pron', {
      pronouns: '  they/them  ',
      icon_action: 'none',
      banner_action: 'none',
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE members SET pronouns = $1'),
      ['they/them', 'u-pron']
    );
    expect(createOrUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({ pronouns: 'they/them' }));
    expect(updated.pronouns).toBe('they/them');

    const mapped = MongoMemberMapper.toDomain({ _id: 'u-pron', username: 'puser', pronouns: 'she/her' });
    expect(mapped.pronouns).toBe('she/her');
    expect(MongoMemberMapper.buildUpsertOps({ id: 'u-pron', username: 'puser', pronouns: 'she/her' }).$set.pronouns).toBe('she/her');
  });
});
