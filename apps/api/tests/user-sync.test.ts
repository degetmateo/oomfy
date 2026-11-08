import { describe, it, expect, beforeAll } from 'vitest';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';

describe('UserSyncService (Cross-Collection Profile Synchronization)', () => {
  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  it('should synchronize author name and avatar across publications and messages collections', async () => {
    const db = MongoDatabase.getDb();
    const testId = 'test-sync-user-uuid-12345';
    const testPubId = 'test-sync-pub-uuid-12345';
    const testMsgId = 'test-sync-msg-uuid-12345';

    await db.collection('publications').insertOne({
      _id: testPubId as any,
      id: testPubId,
      author: { id: testId, username: 'sync_test_user', name: 'Old Name', icon_url: 'https://old.com/a.png' },
      content: 'Testing user synchronization',
      created_at: new Date(),
    });

    await db.collection('messages').insertOne({
      _id: testMsgId as any,
      id: testMsgId,
      chat_id: 'chat-1',
      sender_id: testId,
      sender: { id: testId, username: 'sync_test_user', name: 'Old Name', icon_url: 'https://old.com/a.png' },
      content: 'Old chat message',
      status: 'sent',
      created_at: new Date().toISOString(),
    });

    await UserSyncService.syncProfile(testId, 'sync_test_user', {
      name: 'Updated Cool Name',
      icon_url: 'https://new.com/avatar.gif',
    });

    const updatedPub = await db.collection('publications').findOne({ _id: testPubId as any });
    expect(updatedPub?.author?.name).toBe('Updated Cool Name');
    expect(updatedPub?.author?.icon_url).toBe('https://new.com/avatar.gif');

    const updatedMsg = await db.collection('messages').findOne({ _id: testMsgId as any });
    expect(updatedMsg?.sender?.name).toBe('Updated Cool Name');
    expect(updatedMsg?.sender?.icon_url).toBe('https://new.com/avatar.gif');

    await db.collection('publications').deleteOne({ _id: testPubId as any });
    await db.collection('messages').deleteOne({ _id: testMsgId as any });
  });

  it('should synchronize username across collections', async () => {
    const db = MongoDatabase.getDb();
    const testId = 'test-sync-user-uuid-67890';
    const testPubId = 'test-sync-pub-uuid-67890';

    await db.collection('publications').insertOne({
      _id: testPubId as any,
      id: testPubId,
      author: { id: testId, username: 'old_username', name: 'Some User' },
      content: 'Testing username sync',
      created_at: new Date(),
    });

    await UserSyncService.syncUsername(testId, 'old_username', 'new_cool_username');

    const updated = await db.collection('publications').findOne({ _id: testPubId as any });
    expect(updated?.author?.username).toBe('new_cool_username');

    await db.collection('publications').deleteOne({ _id: testPubId as any });
  });
});
