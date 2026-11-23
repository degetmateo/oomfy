import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService } from '../src/services/chat/MessageService.js';
import { UrlPreviewAdapter } from '../src/infrastructure/adapters/UrlPreviewAdapter.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoBlockRepository } from '../src/infrastructure/repositories/mongo/MongoBlockRepository.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoMessageRepository } from '../src/infrastructure/repositories/mongo/MongoMessageRepository.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { NotificationIconHelper } from '../src/services/notifications/NotificationIconHelper.js';
import { MentionNotificationHelper } from '../src/services/publications/MentionNotificationHelper.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';

describe('Chat Message Link Embeds & Sanitization', () => {
  const sender = { id: '019e6d84-f119-7088-8e10-5d287b359001', username: 'sender', name: 'Sender', role: 'member' };
  const recipientId = '019e6d84-f119-7088-8e10-5d287b359002';
  const chatId = '019e6d84-f119-7088-8e10-5d287b359099';

  let insertedDocs: any[];

  beforeEach(() => {
    vi.restoreAllMocks();
    insertedDocs = [];

    const fakeMessagesCol = {
      insertOne: vi.fn(async (doc: any) => {
        insertedDocs.push(doc);
        return { acknowledged: true };
      }),
      find: vi.fn(() => ({
        sort: () => ({
          limit: () => ({
            toArray: async () => [...insertedDocs].reverse(),
          }),
        }),
      })),
    };

    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({
      collection: () => fakeMessagesCol,
    } as any);
    vi.spyOn(MongoChatRepository, 'isParticipant').mockResolvedValue(true);
    vi.spyOn(MongoChatRepository, 'getChatParticipants').mockResolvedValue([sender.id, recipientId]);
    vi.spyOn(MongoChatRepository, 'updateLastMessage').mockResolvedValue(undefined);
    vi.spyOn(MongoBlockRepository, 'isBlockedEitherWay').mockResolvedValue(false);
    vi.spyOn(MongoMemberRepository, 'findById').mockResolvedValue({
      id: sender.id, username: sender.username, name: sender.name, role: 'member', icon_url: null,
    } as any);
    vi.spyOn(MongoMemberRepository, 'findManyByIds').mockResolvedValue([]);
    vi.spyOn(NotificationIconHelper, 'resolveSenderIcon').mockResolvedValue('/icon.png');
    vi.spyOn(WebPushService, 'sendPushToUser').mockResolvedValue(undefined);
    vi.spyOn(MentionNotificationHelper, 'notifyChatMentions').mockResolvedValue(undefined);
  });

  it('resolves, sanitizes, persists, and broadcasts Spotify, YouTube, and generic link embeds in chat messages', async () => {
    const getPreviewsSpy = vi.spyOn(UrlPreviewAdapter, 'getPreviews').mockResolvedValue([
      {
        type: 'spotify',
        url: 'https://open.spotify.com/track/abc',
        title: 'Track Name',
        iframe_url: 'https://open.spotify.com/embed/track/abc?theme=0',
        thumbnail_url: 'http://i.scdn.co/cover.jpg',
      },
      {
        type: 'youtube',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'Video',
        iframe_url: 'https://evil.example.com/inject',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      },
      {
        type: 'link',
        url: 'https://example.com/article',
        title: 'Example Article',
        description: 'Desc',
      },
    ]);
    const broadcastSpy = vi.spyOn(SocketGateway, 'broadcastChatMessage').mockImplementation(() => {});
    const sendToUserSpy = vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    const msg = await MessageService.sendMessage(
      chatId,
      sender,
      'Escuchen https://open.spotify.com/track/abc y https://youtu.be/dQw4w9WgXcQ y https://example.com/article'
    );

    expect(getPreviewsSpy).toHaveBeenCalledTimes(1);
    expect(msg.embeds).toHaveLength(3);
    expect((msg.embeds?.[0] as any).iframe_url).toBe('https://open.spotify.com/embed/track/abc?theme=0');
    expect((msg.embeds?.[0] as any).thumbnail_url).toBe('https://i.scdn.co/cover.jpg');
    expect((msg.embeds?.[1] as any).iframe_url).toBeUndefined();
    expect(broadcastSpy).toHaveBeenCalledWith(chatId, expect.objectContaining({ embeds: msg.embeds }));
    expect(sendToUserSpy).toHaveBeenCalledWith(recipientId, 'new_chat_message', expect.objectContaining({ embeds: msg.embeds }));
  });

  it('promotes an internal Oomfy publication URL to quoted_publication, strips viewer flags, and skips blocked authors cleanly', async () => {
    const quotedAuthorId = '019e6d84-f119-7088-8e10-5d287b359777';
    vi.spyOn(UrlPreviewAdapter, 'getPreviews').mockResolvedValue([
      {
        type: 'quote',
        url: 'https://oomfy.online/publication/pub-q-1',
        title: 'Quoted',
        target_publication: {
          id: '019e6d84-f119-7088-8e10-5d287b359888',
          author: { id: quotedAuthorId, username: 'qauthor', name: 'Q Author', role: 'member', icon_url: null, banner_url: null },
          type: 'default',
          content: 'Publicación citada en chat',
          created_at: new Date().toISOString(),
          parent_publication_id: null,
          root_publication_id: null,
          images: [],
          embeds: [{ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', iframe_url: 'https://evil.com/bad' }],
          upvotes_count: 5,
          shares_count: 1,
          quotes_count: 0,
          comments_count: 0,
          is_upvoted: true,
          is_shared: true,
        },
      },
    ]);
    vi.spyOn(SocketGateway, 'broadcastChatMessage').mockImplementation(() => {});
    vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    const msg = await MessageService.sendMessage(chatId, sender, 'Mira esto https://oomfy.online/publication/pub-q-1');
    expect(msg.quoted_publication?.content).toBe('Publicación citada en chat');
    expect(msg.quoted_publication?.is_upvoted).toBeUndefined();
    expect(msg.quoted_publication?.is_shared).toBeUndefined();
    expect((msg.quoted_publication?.embeds?.[0] as any).iframe_url).toBeUndefined();

    // Blocked quoted author should not fail sending the chat message
    vi.spyOn(MongoBlockRepository, 'isBlockedEitherWay').mockImplementation(
      async (a, b) => a === quotedAuthorId || b === quotedAuthorId
    );
    const msgBlockedQuote = await MessageService.sendMessage(chatId, sender, 'Link https://oomfy.online/publication/pub-q-1');
    expect(msgBlockedQuote.content).toContain('https://oomfy.online/publication/pub-q-1');
    expect(msgBlockedQuote.quoted_publication).toBeNull();
  });

  it('skips UrlPreviewAdapter.getPreviews when message content has no URLs and sanitizes stored embeds on read', async () => {
    const getPreviewsSpy = vi.spyOn(UrlPreviewAdapter, 'getPreviews');
    vi.spyOn(SocketGateway, 'broadcastChatMessage').mockImplementation(() => {});
    vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    const plainMsg = await MessageService.sendMessage(chatId, sender, 'Hola qué tal sin enlaces');
    expect(getPreviewsSpy).not.toHaveBeenCalled();
    expect(plainMsg.embeds).toEqual([]);
    expect(plainMsg.quoted_publication).toBeNull();

    // Simulate legacy/dirty stored doc with unsafe iframe_url
    insertedDocs.push({
      _id: 'msg-dirty-1',
      id: 'msg-dirty-1',
      chat_id: chatId,
      sender_id: sender.id,
      sender: { id: sender.id, username: sender.username, name: sender.name, icon_url: null },
      content: 'https://youtu.be/dQw4w9WgXcQ',
      embeds: [{ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', iframe_url: 'https://evil.com/xss' }],
      status: 'sent',
      created_at: new Date().toISOString(),
    });

    const loaded = await MongoMessageRepository.listChatMessages(chatId, 30);
    const dirtyLoaded = loaded.find((m) => m.id === 'msg-dirty-1');
    expect(dirtyLoaded?.embeds).toHaveLength(1);
    expect(dirtyLoaded?.embeds?.[0]?.iframe_url).toBeUndefined();
  });
});
