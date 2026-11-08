import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenRefreshService } from '../src/services/auth/TokenRefreshService.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PostgresSessionRepository } from '../src/infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres/PostgresUserRepository.js';

describe('TokenRefreshService (DB-Backed Sliding Session Refresh)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects refresh if session row was deleted from DB', async () => {
    const payload = { id: 'u-1', username: 'alice', name: 'Alice', role: 'member' as const, sessionId: 'sess-1' };
    const refreshToken = TokenService.generateRefreshToken(payload);

    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue(null);

    await expect(TokenRefreshService.execute(refreshToken)).rejects.toThrow(
      'La sesión ha sido cerrada o ya no es válida.'
    );
  });

  it('rotates refresh token in DB and issues new access + refresh tokens when session is valid', async () => {
    const payload = { id: 'u-1', username: 'alice', name: 'Alice', role: 'member' as const, sessionId: 'sess-1' };
    const oldRefresh = TokenService.generateRefreshToken(payload);

    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue({
      id: 'sess-1',
      user_id: 'u-1',
      token: oldRefresh,
      ip_address: '127.0.0.1',
      user_agent: 'Vitest',
      created_at: new Date().toISOString(),
    });
    vi.spyOn(PostgresUserRepository, 'findById').mockResolvedValue({
      id: 'u-1',
      username: 'alice',
      name: 'Alice Updated',
      email: 'alice@oomfy.online',
      role: 'member',
      status: 'active',
    } as any);
    const updateSpy = vi.spyOn(PostgresSessionRepository, 'updateToken').mockResolvedValue();

    const result = await TokenRefreshService.execute(oldRefresh);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(oldRefresh);
    expect(updateSpy).toHaveBeenCalledWith('sess-1', result.refreshToken);

    const decodedAccess = TokenService.verifyAccessToken(result.accessToken);
    expect(decodedAccess.sessionId).toBe('sess-1');
    expect(decodedAccess.name).toBe('Alice Updated');
  });
});
