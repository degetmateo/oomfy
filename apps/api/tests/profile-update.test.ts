import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';
import { ProfileService } from '../src/services/users/ProfileService.js';

describe('ProfileService updateProfile media preservation', () => {
  const queryMock = vi.fn().mockResolvedValue({ rows: [] });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    vi.spyOn(SystemSettingsService, 'getSettings').mockResolvedValue({
      disable_profile_editing: false,
    } as any);
  });

  it('does NOT clear avatar and banner when icon_action and banner_action are none', async () => {
    const existingUser = {
      id: 'user-uuid-123',
      username: 'testuser',
      name: 'Test User',
      email: 'test@oomfy.online',
      role: 'member' as const,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      bio: 'Existing bio',
      location: 'Valdivia',
      link: 'https://oomfy.online',
      icon_url: 'https://img.com/avatar123.jpg',
      banner_url: 'https://img.com/banner123.jpg',
    };

    vi.spyOn(PostgresUserRepository, 'findById').mockResolvedValue(existingUser);
    const createOrUpdateSpy = vi.spyOn(MongoMemberRepository, 'createOrUpdate').mockResolvedValue();
    vi.spyOn(UserSyncService, 'enqueueProfileSync').mockImplementation(() => {});
    vi.spyOn(MongoMemberRepository, 'findById').mockResolvedValue({
      ...existingUser,
      name: 'New Name Only',
    });

    const result = await ProfileService.updateProfile('user-uuid-123', {
      name: 'New Name Only',
      icon_action: 'none',
      banner_action: 'none',
    });

    const calledArg = createOrUpdateSpy.mock.calls[0][0];
    expect(calledArg.id).toBe('user-uuid-123');
    expect(calledArg.name).toBe('New Name Only');
    expect('icon_url' in calledArg).toBe(false);
    expect('banner_url' in calledArg).toBe(false);

    const calls = queryMock.mock.calls;
    const touchedMediaTable = calls.some((c) => c[0].includes('UPDATE icon') || c[0].includes('UPDATE banner'));
    expect(touchedMediaTable).toBe(false);

    expect(result.icon_url).toBe('https://img.com/avatar123.jpg');
    expect(result.banner_url).toBe('https://img.com/banner123.jpg');
  });

  it('ensures MongoMemberRepository.createOrUpdate produces no key conflict between $set and $setOnInsert', async () => {
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({
      collection: vi.fn().mockReturnValue({ updateOne: updateOneMock }),
    } as any);

    await MongoMemberRepository.createOrUpdate({
      id: '018f3a2b-7c1e-7b2a-9f5b-123456789abc',
      username: 'clash_tester',
      name: 'My New Name',
      icon_url: 'https://imgbb.com/photo.jpg',
    });

    expect(updateOneMock).toHaveBeenCalled();
    const updateDoc = updateOneMock.mock.calls[0][1];
    const setKeys = Object.keys(updateDoc.$set);
    const onInsertKeys = Object.keys(updateDoc.$setOnInsert);

    const intersectingKeys = setKeys.filter((k) => onInsertKeys.includes(k));
    expect(intersectingKeys).toEqual([]);
    expect(updateDoc.$set.name).toBe('My New Name');
    expect(updateDoc.$setOnInsert.name).toBeUndefined();
  });
});
