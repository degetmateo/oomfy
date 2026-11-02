import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';

describe('UserSyncService Unit Tests', () => {
  const updateManyPublications = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyFollows = vi.fn().mockResolvedValue({ acknowledged: true });
  const updateManyNotifications = vi.fn().mockResolvedValue({ acknowledged: true });

  const mockDb = {
    collection: vi.fn((colName: string) => {
      if (colName === 'publications') return { updateMany: updateManyPublications };
      if (colName === 'follows') return { updateMany: updateManyFollows };
      if (colName === 'notifications') return { updateMany: updateManyNotifications };
      return { updateMany: vi.fn().mockResolvedValue({}) };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue(mockDb as any);
  });

  it('synchronizes profile name, icon and banner across publications and target publications', async () => {
    await UserSyncService.syncProfile('user-uuid-1', 'charlie', {
      name: 'Charlie New',
      icon_url: 'https://img.com/charlie.png',
      banner_url: 'https://img.com/banner.png',
    });

    expect(mockDb.collection).toHaveBeenCalledWith('publications');
    expect(mockDb.collection).toHaveBeenCalledWith('follows');
    expect(mockDb.collection).toHaveBeenCalledWith('notifications');

    // Verify publications author update
    expect(updateManyPublications).toHaveBeenCalledTimes(2);
    const firstCall = updateManyPublications.mock.calls[0];
    expect(firstCall[1].$set['author.name']).toBe('Charlie New');
    expect(firstCall[1].$set['author.icon_url']).toBe('https://img.com/charlie.png');
    expect(firstCall[1].$set['author.banner_url']).toBe('https://img.com/banner.png');

    // Verify target_publication.author update
    const secondCall = updateManyPublications.mock.calls[1];
    expect(secondCall[1].$set['target_publication.author.name']).toBe('Charlie New');
    expect(secondCall[1].$set['target_publication.author.icon_url']).toBe('https://img.com/charlie.png');
    expect(secondCall[1].$set['target_publication.author.banner_url']).toBe('https://img.com/banner.png');
  });

  it('synchronizes user role across publications, target publications and notifications', async () => {
    await UserSyncService.syncRole('user-uuid-2', 'alice', 'admin');

    expect(updateManyPublications).toHaveBeenCalled();
    const pubAuthorCall = updateManyPublications.mock.calls[0];
    expect(pubAuthorCall[1].$set['author.role']).toBe('admin');

    const targetPubCall = updateManyPublications.mock.calls[1];
    expect(targetPubCall[1].$set['target_publication.author.role']).toBe('admin');

    expect(updateManyNotifications).toHaveBeenCalled();
    const notifCall = updateManyNotifications.mock.calls[0];
    expect(notifCall[1].$set['sender.role']).toBe('admin');
  });

  it('synchronizes username across publications, target publications, follows and notifications', async () => {
    await UserSyncService.syncUsername('user-uuid-3', 'old_name', 'new_name');

    expect(updateManyPublications).toHaveBeenCalledTimes(2);
    const pubAuthorCall = updateManyPublications.mock.calls[0];
    expect(pubAuthorCall[1].$set['author.username']).toBe('new_name');

    const targetPubCall = updateManyPublications.mock.calls[1];
    expect(targetPubCall[1].$set['target_publication.author.username']).toBe('new_name');

    expect(updateManyNotifications).toHaveBeenCalled();
    const notifCall = updateManyNotifications.mock.calls[0];
    expect(notifCall[1].$set['sender.username']).toBe('new_name');
  });
});

