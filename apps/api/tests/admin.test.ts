import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { AdminSessionService } from '../src/services/admin/AdminSessionService.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';

describe('Admin API & System Moderation', () => {
  const server = new Server(5006);
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    await MongoDatabase.connect();
    adminToken = TokenService.generateAccessToken({
      id: '018f3a2b-7c1e-7b2a-9f5b-admin123456', username: 'admin_master', name: 'Admin Master',
      email: 'admin@oomfy.online', role: 'admin',
    });
    memberToken = TokenService.generateAccessToken({
      id: '018f3a2b-7c1e-7b2a-9f5b-member12345', username: 'regular_user', name: 'Regular User',
      email: 'user@oomfy.online', role: 'member',
    });
  });

  it('blocks unauthenticated access to admin settings (401)', async () => {
    const res = await request(server.app).get('/admin/settings');
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users from admin settings (403)', async () => {
    const res = await request(server.app).get('/admin/settings').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admin to retrieve system settings (200)', async () => {
    const res = await request(server.app).get('/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('disable_post_creation');
    expect(res.body.data).toHaveProperty('disable_profile_editing');
    expect(res.body.data).toHaveProperty('disable_signups');
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
    expect(res.body.success).toBe(true);
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
