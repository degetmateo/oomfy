import { describe, it, expect } from 'vitest';
import { PasswordHasher } from '../src/infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { ResendMailerAdapter } from '../src/infrastructure/adapters/ResendMailerAdapter.js';

describe('Security Adapters (Hasher & Token & Privacy)', () => {
  it('should correctly hash and compare passwords', async () => {
    const raw = 'mySuperPassword123';
    const hash = await PasswordHasher.hash(raw);
    expect(hash).not.toBe(raw);
    expect(await PasswordHasher.compare(raw, hash)).toBe(true);
    expect(await PasswordHasher.compare('wrongPassword', hash)).toBe(false);
  });

  it('should generate and verify access tokens', () => {
    const payload = {
      id: '018f3a2b-7c1e-7b2a-9f5b-123456789abc',
      username: 'tester',
      email: 'test@example.com',
      role: 'member',
    };
    const token = TokenService.generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = TokenService.verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.username).toBe(payload.username);
  });

  it('should correctly generate and verify refresh tokens', () => {
    const payload = {
      id: '018f3a2b-7c1e-7b2a-9f5b-123456789abc',
      username: 'tester',
      email: 'test@example.com',
      role: 'member',
    };
    const refreshToken = TokenService.generateRefreshToken(payload);
    expect(typeof refreshToken).toBe('string');

    const decoded = TokenService.verifyRefreshToken(refreshToken);
    expect(decoded.id).toBe(payload.id);
  });

  it('should mask email addresses to prevent logs leaking PII', () => {
    const masked = (ResendMailerAdapter as any).maskEmail('mateo@oomfy.online');
    expect(masked).not.toBe('mateo@oomfy.online');
    expect(masked).toContain('@oomfy.online');
    expect(masked.startsWith('m')).toBe(true);
    expect(masked.includes('*')).toBe(true);
  });
});
