import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../src/services/auth/AuthSessionValidator.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PublicationMapper } from '../src/infrastructure/repositories/mongo/PublicationMapper.js';
import { AdminUserUpdateService } from '../src/services/admin/AdminUserUpdateService.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { safeJsonLd, escapeHtml } from '../src/utils/HtmlEscapeHelper.js';

describe('API Security (Token Types, Session Revocation, Privacy & XSS)', () => {
  const basePayload = { id: 'u-sec-1', username: 'alice', email: 'a@oomfy.online', role: 'member', sessionId: 'sess-sec-1' };

  beforeEach(() => {
    vi.restoreAllMocks();
    AuthSessionValidator.clearMemoryState();
  });

  it('separates access and refresh token types strictly and generates CSPRNG hashes', () => {
    const refreshToken = TokenService.generateRefreshToken(basePayload);
    const accessToken = TokenService.generateAccessToken(basePayload);
    expect(() => TokenService.verifyAccessToken(refreshToken)).toThrow();
    expect(() => TokenService.verifyRefreshToken(accessToken)).toThrow();
    expect(TokenService.verifyRefreshToken(refreshToken).id).toBe('u-sec-1');

    const opaque = TokenService.generateOpaqueToken();
    expect(opaque).toHaveLength(64);
    expect(TokenService.hashToken(opaque)).not.toBe(opaque);
    expect(TokenService.hashToken(opaque)).toHaveLength(64);
  });

  it('rejects sessionless tokens, suspended users, revoked sessions, and pre-reset tokens', async () => {
    await expect(AuthSessionValidator.validate({ ...basePayload, sessionId: undefined })).rejects.toThrow('Sesión inválida');

    const queryMock = vi.fn().mockResolvedValue({ rows: [{ id: 'sess-sec-1', status: 'active', role: 'member' }] });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);

    const oldToken = TokenService.generateAccessToken(basePayload);
    const oldPayload = TokenService.verifyAccessToken(oldToken);

    AuthSessionValidator.suspendUser('u-sec-1');
    await expect(AuthSessionValidator.validate(oldPayload)).rejects.toThrow('suspendida');

    AuthSessionValidator.unsuspendUser('u-sec-1');
    AuthSessionValidator.revokeUserBefore('u-sec-1', 'keep-sess-1');
    await expect(AuthSessionValidator.validate(oldPayload)).rejects.toThrow('expirado');

    const freshPayload = TokenService.verifyAccessToken(TokenService.generateAccessToken(basePayload));
    expect((await AuthSessionValidator.validate(freshPayload)).id).toBe('u-sec-1');

    AuthSessionValidator.revokeSession('sess-x');
    await expect(AuthSessionValidator.validate({ ...basePayload, sessionId: 'sess-x' })).rejects.toThrow('cerrada');
  });

  it('scopes push preferences to user_id and rejects object NoSQLi endpoints', async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const updateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({ collection: () => ({ findOne, updateMany }) } as any);

    await PushSubscriptionRepository.getPreferences('user-A', 'https://victim-endpoint.test/sub');
    expect(findOne.mock.calls[0][0]).toHaveProperty('user_id');

    await PushSubscriptionRepository.deactivateSubscription({ $ne: null } as any, null);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('strips ImgBB delete_url and imgbb_id from mapped publication media', () => {
    const sanitized = PublicationMapper.sanitizeImages([
      { url: 'https://i.ibb.co/img.png', source: 'imgbb', index: 0, delete_url: 'https://ibb.co/del/123', imgbb_id: 'secret123' },
    ]);
    expect(sanitized).toEqual([{ url: 'https://i.ibb.co/img.png', source: 'imgbb', index: 0 }]);
  });

  it('never fetches or leaks password hashes in AdminUserUpdateService', async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'u1', username: 'alice', name: 'Alice', email: 'a@oomfy.online', role: 'member', status: 'active' }],
    });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query } as any);
    const res = await AdminUserUpdateService.updateUser('u1', 'admin-1', {});
    expect(query.mock.calls[0][0]).not.toContain('SELECT *');
    expect((res.user as any).password).toBeUndefined();
  });

  it('escapes HTML and </script> breakout payloads in SEO JSON-LD', () => {
    expect(safeJsonLd({ bio: '</script><script>alert(1)</script>' })).not.toContain('</script>');
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
});
