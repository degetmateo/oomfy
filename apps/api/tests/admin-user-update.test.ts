import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUserUpdateService } from '../src/services/admin/AdminUserUpdateService.js';
import { UserStatusEnforcementHelper } from '../src/services/admin/UserStatusEnforcementHelper.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { BadRequestError, NotFoundError } from '../src/errors/AppError.js';

describe('AdminUserUpdateService', () => {
  beforeEach(() => vi.restoreAllMocks());
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

  it('allows admin to replace email while validating uniqueness and never exposing email in response', async () => {
    const queryMock = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, username')) return { rowCount: 1, rows: [{ id: 'user-1', username: 'alice', name: 'Alice', role: 'member', status: 'active' }] };
      if (sql.includes('LOWER(email)')) return { rowCount: 0, rows: [] };
      if (sql.startsWith('UPDATE members')) return { rowCount: 1, rows: [{ id: 'user-1', username: 'alice', name: 'Alice', role: 'member', status: 'active' }] };
      return { rowCount: 0, rows: [] };
    });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    const revokeSpy = vi.spyOn(UserStatusEnforcementHelper, 'revokeForSecurityChange').mockResolvedValue();

    const res = await AdminUserUpdateService.updateUser('user-1', 'admin-id', { email: 'New@Test.com' });
    expect(res.message).toBe('Usuario actualizado correctamente.');
    expect(res.user).not.toHaveProperty('email');
    expect(revokeSpy).toHaveBeenCalledWith('user-1');
    const updateCall = queryMock.mock.calls.find((c) => String(c[0]).startsWith('UPDATE members'));
    expect(updateCall?.[0]).toContain('email = $2');
    expect(updateCall?.[1]).toContain('new@test.com');
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

