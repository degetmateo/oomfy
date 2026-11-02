import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { UserSyncService } from '../src/services/users/UserSyncService.js';
import { AdminUserService } from '../src/services/admin/AdminUserService.js';

describe('AdminUserService Role Management', () => {
  const queryMock = vi.fn();
  const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
  const mockDb = {
    collection: vi.fn().mockReturnValue({ updateOne: updateOneMock }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue(mockDb as any);
  });

  it('allows promoting another user to admin and triggers role synchronization', async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'target-user-123', username: 'bob_dev' }],
    });

    const syncRoleSpy = vi.spyOn(UserSyncService, 'syncRole').mockResolvedValue();

    const res = await AdminUserService.setUserRole('target-user-123', 'admin', 'admin-caller-999');
    await Promise.resolve();

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE members SET role = $1'),
      ['admin', 'target-user-123']
    );

    expect(mockDb.collection).toHaveBeenCalledWith('members');
    expect(updateOneMock).toHaveBeenCalled();

    expect(syncRoleSpy).toHaveBeenCalledWith('target-user-123', 'bob_dev', 'admin');
    expect(res.message).toContain('admin');
  });

  it('rejects an admin changing their own role', async () => {
    await expect(
      AdminUserService.setUserRole('same-id-123', 'mod', 'same-id-123')
    ).rejects.toThrow('No puedes cambiar tu propio rol.');
  });
});

