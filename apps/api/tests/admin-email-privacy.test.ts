import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { AdminUserQuerySchema, AdminUserUpdateSchema } from '@oomfy/shared';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';

describe('Admin Panel User Email Privacy', () => {
  const server = new Server(5008);
  const adminId = '018f3a2b-7c1e-7b2a-9f5b-000000000001';
  const targetId = '018f3a2b-7c1e-7b2a-9f5b-000000000002';
  let adminToken: string;

  beforeAll(async () => {
    await MongoDatabase.connect();
    adminToken = TokenService.generateAccessToken({
      id: adminId, username: 'admin_priv', name: 'Admin Privacy', email: 'a@oomfy.online', role: 'admin', sessionId: 'sess-priv-1',
    });
  });

  afterAll(() => vi.restoreAllMocks());

  it('strips email from AdminUserQuerySchema while allowing optional replacement in AdminUserUpdateSchema', () => {
    const queryParsed = AdminUserQuerySchema.parse({ query: 'mateo', email: 'secret@oomfy.online' } as any);
    const updateParsed = AdminUserUpdateSchema.parse({ name: 'Mateo', email: 'secret@oomfy.online' });
    expect(queryParsed).not.toHaveProperty('email');
    expect(updateParsed.email).toBe('secret@oomfy.online');
  });

  it('never exposes email in GET /admin/users or PUT /admin/users/:id responses while allowing email replacement', async () => {
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('FROM session')) return { rows: [{ id: params?.[0], status: 'active', role: 'admin' }] };
        if (sql.includes('FROM members WHERE id = $1')) {
          expect(sql).not.toContain('email');
          return { rowCount: 1, rows: [{ id: targetId, username: 'target', name: 'Target', role: 'member', status: 'active' }] };
        }
        if (sql.includes('LOWER(email)')) return { rowCount: 0, rows: [] };
        if (sql.includes('FROM members')) {
          expect(sql).not.toContain('email');
          return { rows: [{ id: targetId, username: 'target', name: 'Target', role: 'member', status: 'active', created_at: '2026-01-01T00:00:00Z' }] };
        }
        if (sql.startsWith('UPDATE members')) {
          expect(sql).not.toContain('RETURNING id, username, name, email');
          return { rowCount: 1, rows: [{ id: targetId, username: 'target', name: 'Updated Name', role: 'member', status: 'active' }] };
        }
        return { rows: [] };
      }),
    } as any);

    const listRes = await request(server.app).get('/admin/users?query=target&email=secret@test.com').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data[0]).not.toHaveProperty('email');

    const putRes = await request(server.app).put(`/admin/users/${targetId}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Updated Name', email: 'evil@test.com' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.user).not.toHaveProperty('email');
  });
});
