import { describe, it, expect, vi } from 'vitest';
import { AdminUserUpdateService } from '../src/services/admin/AdminUserUpdateService.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { BadRequestError, NotFoundError } from '../src/errors/AppError.js';

describe('AdminUserUpdateService', () => {
  it('throws NotFoundError if target member does not exist', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    } as any);

    await expect(
      AdminUserUpdateService.updateUser('non-existent-id', 'admin-id', { name: 'New Name' })
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects invalid username characters or length', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 'user-1', username: 'old' }] }),
    } as any);

    await expect(
      AdminUserUpdateService.updateUser('user-1', 'admin-id', { username: 'a' })
    ).rejects.toThrow(BadRequestError);

    await expect(
      AdminUserUpdateService.updateUser('user-1', 'admin-id', { username: 'invalid name!' })
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects invalid email formats', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 'user-1', email: 'old@test.com' }] }),
    } as any);

    await expect(
      AdminUserUpdateService.updateUser('user-1', 'admin-id', { email: 'not-an-email' })
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects short passwords', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 'user-1' }] }),
    } as any);

    await expect(
      AdminUserUpdateService.updateUser('user-1', 'admin-id', { password: 'short' })
    ).rejects.toThrow(BadRequestError);
  });

  it('prevents an admin from suspending or demoting their own account', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 'admin-id', role: 'admin', status: 'active' }] }),
    } as any);

    await expect(
      AdminUserUpdateService.updateUser('admin-id', 'admin-id', { status: 'suspended' })
    ).rejects.toThrow(BadRequestError);

    await expect(
      AdminUserUpdateService.updateUser('admin-id', 'admin-id', { role: 'member' })
    ).rejects.toThrow(BadRequestError);
  });
});

