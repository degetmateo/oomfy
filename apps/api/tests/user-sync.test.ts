import { describe, it, expect, beforeAll } from 'vitest';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';

describe('UserSyncService (Cross-Collection Profile Synchronization)', () => {
  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  it('should synchronize author name across publications collection', async () => {
    const db = MongoDatabase.getDb();
    const testId = 'test-sync-user-uuid-12345';
    const testPubId = 'test-sync-pub-uuid-12345';

    await db.collection('publications').insertOne({
      _id: testPubId as any,
      id: testPubId,
      author: {
        id: testId,
        username: 'sync_test_user',
        name: 'Old Name',
      },
      content: 'Testing user synchronization',
      created_at: new Date(),
    });

    await UserSyncService.syncProfile(testId, 'sync_test_user', { name: 'Updated Cool Name' });

    const updated = await db.collection('publications').findOne({ _id: testPubId as any });
    expect(updated?.author?.name).toBe('Updated Cool Name');

    await db.collection('publications').deleteOne({ _id: testPubId as any });
  });

  it('should synchronize username across collections', async () => {
    const db = MongoDatabase.getDb();
    const testId = 'test-sync-user-uuid-67890';
    const testPubId = 'test-sync-pub-uuid-67890';

    await db.collection('publications').insertOne({
      _id: testPubId as any,
      id: testPubId,
      author: {
        id: testId,
        username: 'old_username',
        name: 'Some User',
      },
      content: 'Testing username sync',
      created_at: new Date(),
    });

    await UserSyncService.syncUsername(testId, 'old_username', 'new_cool_username');

    const updated = await db.collection('publications').findOne({ _id: testPubId as any });
    expect(updated?.author?.username).toBe('new_cool_username');

    await db.collection('publications').deleteOne({ _id: testPubId as any });
  });
});

