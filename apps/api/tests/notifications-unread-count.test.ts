import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { NotificationDispatcher } from '../src/services/notifications/NotificationDispatcher.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';

describe('Notifications Unread Count & Dispatcher', () => {
  const server = new Server(5018);

  beforeEach(() => vi.restoreAllMocks());

  it('GET /notifications/unread-count returns only pending count without querying full notifications list', async () => {
    const token = TokenService.generateAccessToken({ id: 'u-notif-1', username: 'nuser', email: 'n@test.com', role: 'member' });
    const listSpy = vi.spyOn(MongoNotificationRepository, 'listByRecipient');
    const countSpy = vi.spyOn(MongoNotificationRepository, 'countPending').mockResolvedValue(7);

    const res = await request(server.app).get('/notifications/unread-count').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 7 });
    expect(countSpy).toHaveBeenCalledWith('u-notif-1');
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('NotificationDispatcher persists notification, emits socket event, sends push, and skips self-notifications', async () => {
    const createSpy = vi.spyOn(MongoNotificationRepository, 'create').mockResolvedValue();
    const socketSpy = vi.spyOn(SocketGateway, 'sendNotification').mockImplementation(() => {});
    const pushSpy = vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(0);

    await NotificationDispatcher.dispatch({
      recipientId: 'u-1',
      sender: { id: 'u-1', username: 'alice', name: 'Alice', role: 'member' },
      type: 'upvote',
      targetPublicationId: 'pub-1',
      push: { title: 'Test', body: 'Body', url: '/publication/pub-1', category: 'upvotes' },
    });
    expect(createSpy).not.toHaveBeenCalled();

    await NotificationDispatcher.dispatch({
      recipientId: 'u-2',
      sender: { id: 'u-1', username: 'alice', name: 'Alice', role: 'member' },
      type: 'upvote',
      targetPublicationId: 'pub-1',
      push: { title: 'Alice liked', body: 'Hi', url: '/publication/pub-1', category: 'upvotes' },
    });
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(socketSpy).toHaveBeenCalledWith('u-2', expect.objectContaining({ type: 'upvote', target_publication_id: 'pub-1' }));
    expect(pushSpy).toHaveBeenCalledWith('u-2', { title: 'Alice liked', body: 'Hi', url: '/publication/pub-1' }, 'upvotes');
  });
});

