import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { AdminSessionService } from '../src/services/admin/AdminSessionService.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';

describe('Admin API & System Moderation', () => {
  const server = new Server(5006);
  const adminId = '018f3a2b-7c1e-7b2a-9f5b-admin123456';
  const memberId = '018f3a2b-7c1e-7b2a-9f5b-member12345';
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    await MongoDatabase.connect();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (_sql: string, params?: any[]) => {
        const uid = params?.[1];
        const sid = params?.[0];
        if (uid === adminId) return { rows: [{ id: sid, status: 'active', role: 'admin' }] };
        if (uid === memberId) return { rows: [{ id: sid, status: 'active', role: 'member' }] };
        return { rows: [] };
      }),
    } as any);
    adminToken = TokenService.generateAccessToken({
      id: adminId, username: 'admin_master', name: 'Admin Master', email: 'admin@oomfy.online', role: 'admin', sessionId: 'sess-adm-1',
    });
    memberToken = TokenService.generateAccessToken({
      id: memberId, username: 'regular_user', name: 'Regular User', email: 'user@oomfy.online', role: 'member', sessionId: 'sess-mem-1',
    });
  });

  afterAll(() => vi.restoreAllMocks());

  it('blocks unauthenticated access to admin settings (401)', async () => {
    expect((await request(server.app).get('/admin/settings')).status).toBe(401);
  });

  it('blocks non-admin users from admin settings (403)', async () => {
    expect((await request(server.app).get('/admin/settings').set('Authorization', `Bearer ${memberToken}`)).status).toBe(403);
  });

  it('allows admin to retrieve system settings (200)', async () => {
    const res = await request(server.app).get('/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('disable_post_creation');
    expect(res.body.data).toHaveProperty('disable_signins');
  });

  it('allows admin to update system settings including disable_signins', async () => {
    const res = await request(server.app).put('/admin/settings').set('Authorization', `Bearer ${adminToken}`).send({ disable_signins: true });
    expect(res.status).toBe(200);
    expect(res.body.data.disable_signins).toBe(true);
    await SystemSettingsService.updateSettings({ disable_signins: false });
  });

  it('allows admin to query stats', async () => {
    const res = await request(server.app).get('/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalPublications');
  });

  it('allows admin to revoke all sessions', async () => {
    const spy = vi.spyOn(AdminSessionService, 'revokeAllSessions').mockResolvedValue({ message: 'OK', count: 5 });
    const res = await request(server.app).post('/admin/sessions/revoke-all').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
    spy.mockRestore();
  });

  it('allows admin to revoke sessions for a specific user', async () => {
    const spy = vi.spyOn(AdminSessionService, 'revokeUserSessions').mockResolvedValue({ message: 'OK', count: 2 });
    const res = await request(server.app).post('/admin/users/target-user-123/revoke-sessions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    spy.mockRestore();
  });
});
