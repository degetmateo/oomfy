import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { EmailChangeService } from '../src/services/users/EmailChangeService.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { PasswordHasher } from '../src/infrastructure/adapters/PasswordHasher.js';
import { ResendMailerAdapter } from '../src/infrastructure/adapters/ResendMailerAdapter.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../src/errors/AppError.js';

describe('EmailChangeService (Pre-checks, Verification Token & Post-checks)', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterAll(() => vi.restoreAllMocks());

  it('rejects incorrect password, same email, or email already in use', async () => {
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice', name: 'Alice', email: 'old@oomfy.online', password: 'hash' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice', name: 'Alice', email: 'old@oomfy.online', password: 'hash' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice', name: 'Alice', email: 'old@oomfy.online', password: 'hash' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    vi.spyOn(PasswordHasher, 'compare').mockResolvedValueOnce(false).mockResolvedValue(true);

    await expect(EmailChangeService.requestEmailChange('u1', 'new@oomfy.online', 'wrong')).rejects.toThrow(UnauthorizedError);
    await expect(EmailChangeService.requestEmailChange('u1', 'OLD@oomfy.online', 'ok')).rejects.toThrow(BadRequestError);
    await expect(EmailChangeService.requestEmailChange('u1', 'taken@oomfy.online', 'ok')).rejects.toThrow(ConflictError);
  });

  it('stores hashed token, sends verification email, and commits email upon valid confirmation', async () => {
    let insertedHash = '';
    const queryMock = vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT id, username, name, email, password')) {
        return { rows: [{ id: 'u1', username: 'alice', name: 'Alice', email: 'old@oomfy.online', password: 'hash' }] };
      }
      if (sql.includes('SELECT 1 FROM members WHERE LOWER(email)')) return { rowCount: 0, rows: [] };
      if (sql.startsWith('INSERT INTO email_change_token')) { insertedHash = params?.[3]; return { rowCount: 1 }; }
      if (sql.startsWith('UPDATE email_change_token')) {
        return params?.[0] === insertedHash
          ? { rows: [{ user_id: 'u1', new_email: 'fresh@oomfy.online' }] }
          : { rows: [] };
      }
      if (sql.startsWith('UPDATE members SET email')) return { rowCount: 1, rows: [{ id: 'u1' }] };
      return { rowCount: 0, rows: [] };
    });
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: queryMock } as any);
    vi.spyOn(PasswordHasher, 'compare').mockResolvedValue(true);
    const mailSpy = vi.spyOn(ResendMailerAdapter, 'send').mockResolvedValue();

    const reqRes = await EmailChangeService.requestEmailChange('u1', 'Fresh@oomfy.online', 'valid-pass');
    expect(reqRes.message).toContain('verificación');
    expect(mailSpy).toHaveBeenCalledTimes(1);
    const htmlSent = mailSpy.mock.calls[0][0].html;
    const rawToken = htmlSent.match(/email_token=([a-f0-9]+)/)?.[1];
    expect(rawToken).toBeTruthy();
    expect(TokenService.hashToken(rawToken!)).toBe(insertedHash);

    const confirmRes = await EmailChangeService.confirmEmailChange(rawToken!);
    expect(confirmRes.email).toBe('fresh@oomfy.online');
    await expect(EmailChangeService.confirmEmailChange('invalid-token')).rejects.toThrow(BadRequestError);
  });
});
