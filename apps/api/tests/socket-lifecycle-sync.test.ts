import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSocketHandlers } from '../src/socket/SocketHandlers.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoNotificationRepository } from '../src/infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoMessageRepository } from '../src/infrastructure/repositories/mongo/MongoMessageRepository.js';
import { NotificationService } from '../src/services/notifications/NotificationService.js';

describe('Socket Lifecycle (client:leave / client:return / client:sync)', () => {
  let handlers: Record<string, Function>;
  let mockSocket: any;
  let userSockets: Map<string, Set<string>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    handlers = {};
    mockSocket = {
      id: 'sock-lc-1',
      user: { id: 'user-lc', username: 'lctest', sessionId: 'sess-lc' },
      rooms: new Set(['chat:authorized-chat']),
      join: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      emit: vi.fn(),
      on: (ev: string, fn: Function) => { handlers[ev] = fn; },
    };
    userSockets = new Map();
    registerSocketHandlers(mockSocket, userSockets);
  });

  it('handles client:leave even without socket.data and broadcasts user-stop-typing for authorized chat', async () => {
    vi.spyOn(MongoChatRepository, 'getChatParticipants').mockResolvedValue(['user-lc', 'user-peer']);
    const sendToUserSpy = vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    await handlers['client:leave']({ activeChatId: 'authorized-chat', timestamp: Date.now() });

    expect(typeof mockSocket.data?.awaySince).toBe('number');
    expect(mockSocket.to).toHaveBeenCalledWith('chat:authorized-chat');
    expect(sendToUserSpy).toHaveBeenCalledWith('user-peer', 'user-stop-typing', expect.objectContaining({ chatId: 'authorized-chat' }));
  });

  it('authorizes rejoined chats, populates missed notifications, and emits single client:sync on client:return', async () => {
    vi.spyOn(MongoChatRepository, 'isParticipant').mockImplementation(async (cid) => cid === 'chat-extra');
    vi.spyOn(MongoNotificationRepository, 'countPending').mockResolvedValue(2);
    vi.spyOn(MongoMessageRepository, 'countUnreadMessages').mockResolvedValue(4);
    vi.spyOn(MongoNotificationRepository, 'listSince').mockResolvedValue([
      { id: 'n1', recipient_id: 'user-lc', type: 'mention', target_publication_id: 'p1', status: 'pending', created_at: new Date().toISOString() } as any,
    ]);
    vi.spyOn(NotificationService, 'populateTargetPublications').mockImplementation(async (list) => {
      list[0].target_publication = { id: 'p1', content: 'Populated' } as any;
      return list;
    });
    vi.spyOn(MongoMessageRepository, 'listChatMessagesSince').mockResolvedValue([
      { id: 'm1', chat_id: 'authorized-chat', sender_id: 'user-peer', content: 'Back yet?', created_at: new Date().toISOString() } as any,
    ]);

    const ack = vi.fn();
    await handlers['client:return']({
      since: Date.now() - 10_000,
      activeChatId: 'authorized-chat',
      chatIds: ['authorized-chat', 'chat-extra', 'unauthorized-chat'],
    }, ack);

    expect(mockSocket.join).toHaveBeenCalledWith('chat:chat-extra');
    expect(mockSocket.join).not.toHaveBeenCalledWith('chat:unauthorized-chat');
    expect(mockSocket.emit).toHaveBeenCalledWith('client:sync', expect.objectContaining({
      unread_notifications_count: 2,
      unread_messages_count: 4,
      rejoined_chats: ['authorized-chat', 'chat-extra'],
      missed_notifications: expect.arrayContaining([expect.objectContaining({ target_publication: expect.objectContaining({ id: 'p1' }) })]),
      missed_messages: { 'authorized-chat': expect.arrayContaining([expect.objectContaining({ id: 'm1' })]) },
    }));
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
