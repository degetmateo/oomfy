import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';
import { BackgroundTaskDispatcher } from '../src/infrastructure/async/BackgroundTaskDispatcher.js';

describe('UserSyncService Unit Tests', () => {
  const updateManyPublications = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyFollows = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyNotifications = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyChats = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyMessages = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyReports = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyPushSubs = vi.fn().mockResolvedValue({ acknowledged: true });

  const mockDb = {
    collection: vi.fn((colName: string) => {
      if (colName === 'publications') return { updateMany: updateManyPublications };
      if (colName === 'follows') return { updateMany: updateManyFollows };
      if (colName === 'notifications') return { updateMany: updateManyNotifications };
      if (colName === 'chats') return { updateMany: updateManyChats };
      if (colName === 'messages') return { updateMany: updateManyMessages };
      if (colName === 'reports') return { updateMany: updateManyReports };
      if (colName === 'push_subscriptions') return { updateMany: updateManyPushSubs };
      return { updateMany: vi.fn().mockResolvedValue({}) };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue(mockDb as any);
  });

  it('synchronizes profile name, icon and banner across publications, chats, messages, follows and notifications', async () => {
    await UserSyncService.syncProfile('user-uuid-1', 'charlie', {
      name: 'Charlie New',
      icon_url: 'https://img.com/charlie.png',
      banner_url: 'https://img.com/banner.png',
    });

    expect(updateManyPublications).toHaveBeenCalledTimes(2);
    expect(updateManyPublications.mock.calls[0][1].$set['author.name']).toBe('Charlie New');
    expect(updateManyPublications.mock.calls[0][1].$set['author.icon_url']).toBe('https://img.com/charlie.png');
    expect(updateManyPublications.mock.calls[1][1].$set['target_publication.author.icon_url']).toBe('https://img.com/charlie.png');

    expect(updateManyChats).toHaveBeenCalledTimes(1);
    expect(updateManyChats.mock.calls[0][1].$set['participants.$[elem].name']).toBe('Charlie New');
    expect(updateManyChats.mock.calls[0][1].$set['participants.$[elem].icon_url']).toBe('https://img.com/charlie.png');

    expect(updateManyMessages).toHaveBeenCalledTimes(2);
    expect(updateManyMessages.mock.calls[0][1].$set['sender.name']).toBe('Charlie New');
    expect(updateManyMessages.mock.calls[0][1].$set['sender.icon_url']).toBe('https://img.com/charlie.png');
    expect(updateManyMessages.mock.calls[1][1].$set['reply_to.sender_name']).toBe('Charlie New');
  });

  it('synchronizes user role across publications, messages and notifications', async () => {
    await UserSyncService.syncRole('user-uuid-2', 'alice', 'admin');

    expect(updateManyPublications.mock.calls[0][1].$set['author.role']).toBe('admin');
    expect(updateManyPublications.mock.calls[1][1].$set['target_publication.author.role']).toBe('admin');
    expect(updateManyMessages.mock.calls[0][1].$set['sender.role']).toBe('admin');
    expect(updateManyNotifications.mock.calls[0][1].$set['sender.role']).toBe('admin');
  });

  it('synchronizes username across all collections including chats, messages, reports and push_subscriptions', async () => {
    await UserSyncService.syncUsername('user-uuid-3', 'old_name', 'new_name');

    expect(updateManyPublications.mock.calls[0][1].$set['author.username']).toBe('new_name');
    expect(updateManyChats.mock.calls[0][1].$set['participants.$[elem].username']).toBe('new_name');
    expect(updateManyMessages.mock.calls[0][1].$set['sender.username']).toBe('new_name');
    expect(updateManyMessages.mock.calls[1][1].$set['reply_to.sender_username']).toBe('new_name');
    expect(updateManyNotifications.mock.calls[0][1].$set['sender.username']).toBe('new_name');
    expect(updateManyReports).toHaveBeenCalledTimes(2);
    expect(updateManyPushSubs).toHaveBeenCalledTimes(1);
  });

  it('processes enqueued profile sync steps sequentially via BackgroundTaskDispatcher', async () => {
    UserSyncService.enqueueProfileSync('user-uuid-4', 'dave', { icon_url: 'https://img.com/dave-new.gif' });
    await BackgroundTaskDispatcher.waitForIdle();

    expect(updateManyMessages).toHaveBeenCalled();
    expect(updateManyMessages.mock.calls[0][1].$set['sender.icon_url']).toBe('https://img.com/dave-new.gif');
  });
});
