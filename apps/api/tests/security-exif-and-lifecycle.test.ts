import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { stripImageMetadata } from '../src/utils/ImageMetadataStripper.js';
import { isOriginAllowed } from '../src/config/CorsPolicy.js';
import { isPrivateOrReservedIp } from '../src/utils/UrlSecurityHelper.js';
import { VerifyService } from '../src/services/auth/VerifyService.js';
import { SigninService } from '../src/services/auth/SigninService.js';
import { TokenRefreshService } from '../src/services/auth/TokenRefreshService.js';
import { AccountLifecycleService } from '../src/services/users/AccountLifecycleService.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { PasswordHasher } from '../src/infrastructure/adapters/PasswordHasher.js';
import { UnauthorizedError } from '../src/errors/AppError.js';

describe('Hito 49 Hardening: EXIF Strip, CORS, SSRF, Cookies, Verify & Account Lifecycle', () => {
  const server = new Server(5019);
  beforeEach(() => vi.restoreAllMocks());

  it('strips JPEG APP1/EXIF and PNG tEXt metadata chunks cleanly', () => {
    const exifSeg = Buffer.from([0xff, 0xe1, 0x00, 0x0a, ...Buffer.from('Exif\0\0GPS')]);
    const sofSeg = Buffer.from([0xff, 0xc0, 0x00, 0x05, 0x08, 0x00, 0x01]);
    const sosSeg = Buffer.from([0xff, 0xda, 0x00, 0x03, 0x00, 0x11, 0x22, 0xff, 0xd9]);
    const jpegOut = stripImageMetadata(Buffer.concat([Buffer.from([0xff, 0xd8]), exifSeg, sofSeg, sosSeg]));
    expect(jpegOut.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(jpegOut.includes(Buffer.from('GPS'))).toBe(false);
    expect(jpegOut.includes(sofSeg)).toBe(true);

    const makeChunk = (t: string, d: string) => Buffer.concat([Buffer.from([0, 0, 0, d.length]), Buffer.from(t + d), Buffer.alloc(4)]);
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngOut = stripImageMetadata(Buffer.concat([pngSig, makeChunk('IHDR', 'hdr'), makeChunk('tEXt', 'Author'), makeChunk('IDAT', 'px'), makeChunk('IEND', '')]));
    expect(pngOut.includes(Buffer.from('Author'))).toBe(false);
    expect(pngOut.includes(Buffer.from('IHDR'))).toBe(true);
    expect(pngOut.includes(Buffer.from('IEND'))).toBe(true);
  });

  it('allows only Oomfy domains in CORS and blocks CGNAT/IPv6-mapped SSRF ranges', () => {
    expect(isOriginAllowed('https://oomfy.online')).toBe(true);
    expect(isOriginAllowed('https://api.oomfy.online')).toBe(true);
    expect(isOriginAllowed('https://anything.onrender.com')).toBe(false);
    expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('fd12:3456::1')).toBe(true);
    expect(isPrivateOrReservedIp('2001:db8::1')).toBe(true);
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
  });

  it('sets host-only httpOnly cookie, purges legacy Domain=.oomfy.online shadow cookie, and falls back across duplicate cookies', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      vi.spyOn(SigninService, 'execute').mockResolvedValue({ accessToken: 'acc-1', refreshToken: 'ref-1', user: { id: 'u1', username: 'alice', role: 'member' } });
      const res = await request(server.app).post('/auth/signin').set('Host', 'api.oomfy.online').send({ username: 'alice', password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.refreshToken).toBe('ref-1');
      const setCookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];
      expect(setCookies[0]).toContain('refresh_token=ref-1');
      expect(setCookies[0]).not.toContain('Domain=.oomfy.online');
      expect(['SameSite=None', 'HttpOnly', 'Secure'].every((a) => setCookies[0].includes(a))).toBe(true);
      expect(setCookies.some((c: string) => c.includes('Domain=.oomfy.online') && c.includes('refresh_token=;'))).toBe(true);

      const execSpy = vi.spyOn(TokenRefreshService, 'execute').mockRejectedValueOnce(new Error('Token inválido')).mockResolvedValueOnce({ accessToken: 'acc-2', refreshToken: 'ref-2' });
      const refRes = await request(server.app).post('/auth/refresh').set('Host', 'api.oomfy.online').set('Origin', 'https://oomfy.online').set('Cookie', 'refresh_token=legacy-shadow; refresh_token=ref-1').send({ refreshToken: 'ref-1' });
      expect(refRes.status).toBe(200);
      expect(execSpy).toHaveBeenNthCalledWith(1, 'legacy-shadow');
      expect(execSpy).toHaveBeenNthCalledWith(2, 'ref-1');
      expect(refRes.body).toMatchObject({ accessToken: 'acc-2', refreshToken: 'ref-2' });
    } finally { process.env.NODE_ENV = origEnv; }
  });

  it('enforces single-use opaque verification tokens and exports/deletes user accounts safely', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (sql: string) =>
        sql.includes('FROM session') ? { rows: [{ id: 'sess-del-1', status: 'active', role: 'member' }] } : { rows: [] }
      ),
    } as any);
    await expect(VerifyService.execute('replayed-token', '127.0.0.1', 'Web')).rejects.toThrow('inválido');

    vi.spyOn(AccountLifecycleService, 'deleteMyAccount').mockRejectedValueOnce(new UnauthorizedError('Contraseña incorrecta.'));
    const token = TokenService.generateAccessToken({ id: 'u-del', username: 'alice', email: 'a@oomfy.online', role: 'member', sessionId: 'sess-del-1' });
    expect((await request(server.app).delete('/members/me').set('Authorization', `Bearer ${token}`).send({ password: 'wrong' })).status).toBe(401);

    const passwordHash = await PasswordHasher.hash('CorrectPass1!');
    const queries: string[] = [];
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (sql: string) => {
        queries.push(sql);
        return sql.includes('SELECT id, username, password') ? { rows: [{ id: 'u-del', username: 'alice', password: passwordHash }] } : { rows: [] };
      }),
    } as any);
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({
      collection: () => ({ find: () => ({ toArray: async () => [] }), deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }), updateMany: vi.fn(), deleteOne: vi.fn() }),
    } as any);

    const res = await AccountLifecycleService.deleteMyAccount('u-del', 'CorrectPass1!');
    expect(res.message).toContain('eliminados');
    expect(queries.some((q) => q.includes('DELETE FROM members WHERE id = $1'))).toBe(true);
  });
});
