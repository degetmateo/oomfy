import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenRefreshService } from '../src/services/auth/TokenRefreshService.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
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

  it('tolerates concurrent multi-tab rotation within grace window without deleting session', async () => {
    const payload = { id: 'u-1', username: 'alice', email: 'a@oomfy.online', role: 'member' as const, sessionId: 'sess-grace' };
    const prevRefresh = TokenService.generateRefreshToken(payload);

    vi.spyOn(PostgresSessionRepository, 'findByToken').mockResolvedValue({
      id: 'sess-grace', user_id: 'u-1', token: 'hashed-r2', previous_token_hash: 'hashed-r1',
      reused: false, rotatedFromPrevious: true, created_at: new Date().toISOString(),
    });
    vi.spyOn(PostgresUserRepository, 'findById').mockResolvedValue({
      id: 'u-1', username: 'alice', name: 'Alice', email: 'a@oomfy.online', role: 'member', status: 'active',
    } as any);
    const updateSpy = vi.spyOn(PostgresSessionRepository, 'updateToken').mockResolvedValue();
    const deleteSpy = vi.spyOn(PostgresSessionRepository, 'deleteById').mockResolvedValue(true);

    const res = await TokenRefreshService.execute(prevRefresh);
    expect(res.accessToken).toBeTruthy();
    expect(res.refreshToken).not.toBe(prevRefresh);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith('sess-grace', res.refreshToken, undefined);
  });

  it('distinguishes concurrent grace window vs stale previous-token replay in PostgresSessionRepository', async () => {
    const prevToken = 'raw-prev-token';
    const prevHash = TokenService.hashToken(prevToken);
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 's1', user_id: 'u1', token: 'new-hash', previous_token_hash: prevHash, within_grace: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 's1', user_id: 'u1', token: 'new-hash', previous_token_hash: prevHash, within_grace: false }] });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);

    const withinGrace = await PostgresSessionRepository.findByToken(prevToken);
    expect(withinGrace?.reused).toBe(false);
    expect(withinGrace?.rotatedFromPrevious).toBe(true);

    const staleReplay = await PostgresSessionRepository.findByToken(prevToken);
    expect(staleReplay?.reused).toBe(true);
    expect(staleReplay?.rotatedFromPrevious).toBe(false);
  });

  it('aborts executeAny immediately when token reuse security error is thrown', async () => {
    const spy = vi.spyOn(TokenRefreshService, 'execute').mockRejectedValueOnce(new Error('La sesión ha sido cerrada por seguridad.'));
    await expect(TokenRefreshService.executeAny(['reused', 'valid-backup'])).rejects.toThrow('por seguridad');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
