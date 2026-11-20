import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';
import { MongoReportRepository } from '../src/infrastructure/repositories/mongo/MongoReportRepository.js';
import { ReportService } from '../src/services/reports/ReportService.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { WebPushService } from '../src/services/notifications/WebPushService.js';
import { WebPushClient } from '../src/infrastructure/adapters/WebPushClient.js';
import { PushSubscriptionRepository } from '../src/infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { UpvoteService } from '../src/services/interactions/UpvoteService.js';
import { registerInteractionSocketHandlers } from '../src/socket/SocketInteractionHandlers.js';

describe('Report Counters, Priority Sorting, Socket Interactions & Silent Push', () => {
  const pubHighId = '019e6d84-f119-7088-8e10-5d287b390001';
  const pubLowId = '019e6d84-f119-7088-8e10-5d287b390002';

  beforeAll(async () => {
    await MongoDatabase.connect();
    await MongoDatabase.getDb().collection('reports').deleteMany({ target_id: { $in: [...MongoIdHelper.idVariants(pubHighId), ...MongoIdHelper.idVariants(pubLowId)] } });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await MongoDatabase.getDb().collection('reports').deleteMany({ target_id: { $in: [...MongoIdHelper.idVariants(pubHighId), ...MongoIdHelper.idVariants(pubLowId)] } });
    await MongoDatabase.disconnect();
  });

  it('increments target_reports_count across distinct reporters and sorts highest reported first', async () => {
    vi.spyOn(MongoPublicationRepository, 'findById').mockImplementation(async (id) => ({
      id, content: `Post ${id}`, author: { id: 'author-r', username: 'rep_target', name: 'T', role: 'member' },
    } as any));

    await ReportService.createReport({ id: 'rep-1', username: 'r1' }, { target_type: 'publication', target_id: pubLowId, reason: 'Spam' });
    await ReportService.createReport({ id: 'rep-1', username: 'r1' }, { target_type: 'publication', target_id: pubHighId, reason: 'Abuso' });
    const secondReport = await ReportService.createReport({ id: 'rep-2', username: 'r2' }, { target_type: 'publication', target_id: pubHighId, reason: 'Acose' });
    expect(secondReport.target_reports_count).toBe(2);

    const { reports } = await MongoReportRepository.list('pending', 1, 50);
    const highIdx = reports.findIndex((r) => r.target_id === pubHighId);
    const lowIdx = reports.findIndex((r) => r.target_id === pubLowId);
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(lowIdx).toBeGreaterThan(highIdx);
    expect(reports[highIdx].target_reports_count).toBeGreaterThanOrEqual(2);
  });

  it('handles publication:upvote socket event and returns updated counter in ack', async () => {
    vi.spyOn(UpvoteService, 'upvote').mockResolvedValue({ upvoted: true, upvotes_count: 5 });
    const handlers = new Map<string, any>();
    const fakeSocket: any = { on: (ev: string, fn: any) => handlers.set(ev, fn) };
    registerInteractionSocketHandlers(fakeSocket, { id: 'u1', username: 'u1', name: 'U1', role: 'member' }, () => true);

    const ack = vi.fn();
    await handlers.get('publication:upvote')({ postId: 'pub-sock-1', action: 'add' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true, upvoted: true, upvotes_count: 5 });
  });

  it('dispatches silent push payload and low-urgency APNs priority when category *_silent is enabled', async () => {
    vi.spyOn(PushSubscriptionRepository, 'findActiveSubscriptions').mockResolvedValue([
      { endpoint: 'https://web.push.apple.com/s1', keys: { p256dh: 'p', auth: 'a' }, preferences: { messages: true, messages_silent: true } },
    ] as any);
    const sendSpy = vi.spyOn(WebPushClient, 'send').mockResolvedValue();

    const sent = await WebPushService.sendPushToUser('u-silent', { title: 'Msg', body: 'Hola' }, 'messages');
    expect(sent).toBe(1);
    const payloadJson = JSON.parse(sendSpy.mock.calls[0][1]);
    expect(payloadJson.silent).toBe(true);
    expect(sendSpy.mock.calls[0][2]).toEqual({ silent: true });
  });
});
