import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { ReportService } from '../src/services/reports/ReportService.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Reports and Staff Moderation API', () => {
  const server = new Server(5015);

  beforeAll(async () => {
    await MongoDatabase.connect();
  });

  afterAll(async () => {
    await MongoDatabase.disconnect();
  });

  it('rejects unauthenticated requests to POST /api/reports', async () => {
    const res = await request(server.app).post('/api/reports').send({
      target_type: 'publication',
      target_id: 'test-id',
      reason: 'Spam',
    });
    expect(res.status).toBe(401);
  });

  it('rejects standard users from accessing GET /api/staff/reports', async () => {
    const userToken = TokenService.generateAccessToken({
      id: 'normal-user-1',
      username: 'normaluser',
      email: 'normal@test.com',
      role: 'member',
    });

    const res = await request(server.app)
      .get('/api/staff/reports')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('allows staff with mod role to access GET /api/staff/reports', async () => {
    const modToken = TokenService.generateAccessToken({
      id: 'mod-user-1',
      username: 'moderator1',
      email: 'mod@test.com',
      role: 'mod',
    });

    const res = await request(server.app)
      .get('/api/staff/reports')
      .set('Authorization', `Bearer ${modToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.reports)).toBe(true);
  });

  it('creates and resolves reports via ReportService with UUIDv7 _id', async () => {
    const reporter = { id: 'rep-user-1', username: 'reporter1' };
    const report = await ReportService.createReport(reporter, {
      target_type: 'publication',
      target_id: 'target-post-1',
      target_username: 'badactor',
      target_content: 'Spammy content link',
      reason: 'Spam o publicidad no deseada',
      details: 'Links repetitivos sospechosos',
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe('pending');

    const col = MongoDatabase.getDb().collection('reports');
    const saved = await col.findOne({ id: report.id });
    expect(saved).toBeDefined();
    expect(saved?._id).toBe(report.id);

    const resolveRes = await ReportService.resolveReport(report.id, 'resolved', 'moderator1');
    expect(resolveRes.message).toContain('resolved');

    const updated = await col.findOne({ id: report.id });
    expect(updated?.status).toBe('resolved');
    expect(updated?.resolved_by).toBe('moderator1');
  });
});

