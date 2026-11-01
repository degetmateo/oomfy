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
      id: '018f3a2b-7c1e-7b2a-9f5b-admin123456',
      username: 'admin_master',
      name: 'Admin Master',
      email: 'admin@oomfy.online',
      role: 'admin',
    });

    memberToken = TokenService.generateAccessToken({
      id: '018f3a2b-7c1e-7b2a-9f5b-member12345',
      username: 'regular_user',
      name: 'Regular User',
      email: 'user@oomfy.online',
      role: 'member',
    });
  });

  it('should block unauthenticated access to admin settings (401)', async () => {
    const res = await request(server.app).get('/api/admin/settings');
    expect(res.status).toBe(401);
  });

  it('should block non-admin users from admin settings (403)', async () => {
    const res = await request(server.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('should allow admin to retrieve system settings (200)', async () => {
    const res = await request(server.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('disable_post_creation');
    expect(res.body.data).toHaveProperty('disable_profile_editing');
    expect(res.body.data).toHaveProperty('disable_signups');
    expect(res.body.data).toHaveProperty('disable_signins');
  });

  it('should allow admin to update system settings including disable_signins', async () => {
    const res = await request(server.app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ disable_signins: true });
    expect(res.status).toBe(200);
    expect(res.body.data.disable_signins).toBe(true);

    // Reset back
    await SystemSettingsService.updateSettings({ disable_signins: false });
  });

  it('should allow admin to query stats', async () => {
    const res = await request(server.app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalPublications');
  });

  it('should allow admin to revoke all sessions', async () => {
    const spy = vi.spyOn(AdminSessionService, 'revokeAllSessions').mockResolvedValue({
      message: 'Se cerraron exitosamente 5 sesiones activas en la plataforma.',
      count: 5,
    });
    const res = await request(server.app)
      .post('/api/admin/sessions/revoke-all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(5);
    spy.mockRestore();
  });

  it('should allow admin to revoke sessions for a specific user', async () => {
    const spy = vi.spyOn(AdminSessionService, 'revokeUserSessions').mockResolvedValue({
      message: 'Se cerraron exitosamente 2 sesiones activas del usuario.',
      count: 2,
    });
    const res = await request(server.app)
      .post('/api/admin/users/target-user-123/revoke-sessions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    spy.mockRestore();
  });
});
