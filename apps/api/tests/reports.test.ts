import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { PostgresPool } from '../src/infrastructure/database/postgres/PostgresPool.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { ReportService } from '../src/services/reports/ReportService.js';
import { TokenService } from '../src/infrastructure/adapters/TokenService.js';

describe('Reports and Staff Moderation API', () => {
  const server = new Server(5015);

  beforeAll(async () => {
    await MongoDatabase.connect();
    vi.spyOn(PostgresPool, 'getInstance').mockReturnValue({
      query: vi.fn().mockImplementation(async (_sql: string, params?: any[]) => ({
        rows: [{ id: params?.[0], status: 'active', role: params?.[1] === 'mod-user-1' ? 'mod' : 'member' }],
      })),
    } as any);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await MongoDatabase.disconnect();
  });

  it('rejects unauthenticated requests to POST /reports', async () => {
    const res = await request(server.app).post('/reports').send({ target_type: 'publication', target_id: 'test-id', reason: 'Spam' });
    expect(res.status).toBe(401);
  });

  it('rejects standard users from accessing GET /staff/reports', async () => {
    const userToken = TokenService.generateAccessToken({
      id: 'normal-user-1', username: 'normaluser', email: 'normal@test.com', role: 'member', sessionId: 'sess-norm-1',
    });
    const res = await request(server.app).get('/staff/reports').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('allows staff with mod role to access GET /staff/reports', async () => {
    const modToken = TokenService.generateAccessToken({
      id: 'mod-user-1', username: 'moderator1', email: 'mod@test.com', role: 'mod', sessionId: 'sess-mod-1',
    });
    const res = await request(server.app).get('/staff/reports').set('Authorization', `Bearer ${modToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.reports)).toBe(true);
  });

  it('rejects reports for non-existent targets and creates/resolves valid reports with UUIDv7 _id', async () => {
    const reporter = { id: 'rep-user-1', username: 'reporter1' };
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValueOnce(null);
    await expect(
      ReportService.createReport(reporter, { target_type: 'publication', target_id: 'missing-post', reason: 'Spam' })
    ).rejects.toThrow('no encontrada');

    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValueOnce({
      id: 'target-post-1', content: 'Spammy content link', author: { id: 'u2', username: 'badactor', name: 'Bad', role: 'member' },
    } as any);
    const report = await ReportService.createReport(reporter, {
      target_type: 'publication', target_id: 'target-post-1', reason: 'Spam o publicidad no deseada', details: 'Links sospechosos',
    });
    expect(report.status).toBe('pending');
    expect(report.target_username).toBe('badactor');

    const resolveRes = await ReportService.resolveReport(report.id, 'resolved', 'moderator1');
    expect(resolveRes.message).toContain('resolved');

    const col = MongoDatabase.getDb().collection('reports');
    const updated = await col.findOne({ id: report.id });
    expect(updated?.status).toBe('resolved');
    expect(updated?.resolved_by).toBe('moderator1');
    await col.deleteOne({ id: report.id });
  });
});
