import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenRefreshService } from '../src/services/auth/TokenRefreshService.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PostgresSessionRepository } from '../src/infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres/PostgresUserRepository.js';

describe('TokenRefreshService (DB-Backed Sliding Session Refresh)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects refresh if session row was deleted from DB', async () => {
    const payload = { id: 'u-1', username: 'alice', email: 'a@oomfy.online', role: 'member' as const, sessionId: 'sess-1' };
    const refreshToken = TokenService.generateRefreshToken(payload);
    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue(null);

    await expect(TokenRefreshService.execute(refreshToken)).rejects.toThrow('La sesión ha sido cerrada o ya no es válida.');
  });

  it('revokes entire session immediately if a rotated previous refresh token is reused', async () => {
    const payload = { id: 'u-1', username: 'alice', email: 'a@oomfy.online', role: 'member' as const, sessionId: 'sess-reused' };
    const reusedRefresh = TokenService.generateRefreshToken(payload);
    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue({
      id: 'sess-reused', user_id: 'u-1', token: 'hashed-current', previous_token_hash: 'hashed-prev',
      reused: true, created_at: new Date().toISOString(),
    });
    const deleteSpy = vi.spyOn(PostgresSessionRepository, 'deleteById').mockResolvedValue(true);

    await expect(TokenRefreshService.execute(reusedRefresh)).rejects.toThrow('seguridad');
    expect(deleteSpy).toHaveBeenCalledWith('sess-reused', 'u-1');
  });

  it('rotates refresh token in DB passing previous token hash when session is valid', async () => {
    const payload = { id: 'u-1', username: 'alice', email: 'a@oomfy.online', name: 'Alice', role: 'member' as const, sessionId: 'sess-1' };
    const oldRefresh = TokenService.generateRefreshToken(payload);

    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue({
      id: 'sess-1', user_id: 'u-1', token: 'hashed', ip_address: '127.0.0.1', user_agent: 'Vitest', created_at: new Date().toISOString(),
    });
    vi.spyOn(PostgresUserRepository, 'findById').mockResolvedValue({
      id: 'u-1', username: 'alice', name: 'Alice Updated', email: 'alice@oomfy.online', role: 'member', status: 'active',
    } as any);
    const updateSpy = vi.spyOn(PostgresSessionRepository, 'updateToken').mockResolvedValue();

    const result = await TokenRefreshService.execute(oldRefresh);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(oldRefresh);
    expect(updateSpy).toHaveBeenCalledWith('sess-1', result.refreshToken, oldRefresh);

    const decodedAccess = TokenService.verifyAccessToken(result.accessToken);
    expect(decodedAccess.sessionId).toBe('sess-1');
    expect(decodedAccess.name).toBe('Alice Updated');
  });
});
