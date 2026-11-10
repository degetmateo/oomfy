import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { MongoMemberMapper } from '../src/infrastructure/repositories/mongo/MongoMemberMapper.js';
import { ProfileService } from '../src/services/users/ProfileService.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';

describe('Terms & Privacy Acceptance Flow (API)', () => {
  const server = new Server(5011);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults terms_accepted to false for legacy user docs without the field', () => {
    const legacyDoc = { id: 'u1', username: 'legacy', name: 'Legacy User', role: 'member' };
    const mapped = MongoMemberMapper.toDomain(legacyDoc);
    expect(mapped.terms_accepted).toBe(false);
    expect(mapped.terms_accepted_at).toBeNull();

    const acceptedDoc = { ...legacyDoc, terms_accepted: true, terms_accepted_at: '2026-11-10T00:00:00Z' };
    expect(MongoMemberMapper.toDomain(acceptedDoc).terms_accepted).toBe(true);
  });

  it('rejects unauthenticated POST /members/me/accept-terms and updates when authenticated', async () => {
    const unauth = await request(server.app).post('/members/me/accept-terms');
    expect(unauth.status).toBe(401);

    const token = TokenService.generateAccessToken({
      id: 'u-legacy-1',
      username: 'legacy_user',
      email: 'legacy@oomfy.online',
      role: 'member',
    });

    const acceptedUser: any = {
      id: 'u-legacy-1',
      username: 'legacy_user',
      name: 'Legacy User',
      role: 'member',
      terms_accepted: true,
      terms_accepted_at: '2026-11-10T11:00:00Z',
    };

    vi.spyOn(MongoMemberRepository, 'acceptTerms').mockResolvedValue(acceptedUser);
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({ query: vi.fn().mockResolvedValue({}) } as any);
    const spy = vi.spyOn(ProfileService, 'acceptTerms');

    const res = await request(server.app)
      .post('/members/me/accept-terms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.terms_accepted).toBe(true);
    expect(spy).toHaveBeenCalledWith('u-legacy-1');
  });
});

