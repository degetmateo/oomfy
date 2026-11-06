import { v7 as uuidv7 } from 'uuid';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { WebPushService } from '../notifications/WebPushService.js';
import { PublicationSnippetHelper } from '../publications/PublicationSnippetHelper.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { NotFoundError } from '../../errors/AppError.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class ShareService {
  public static async share(
    publicationId: string,
    user: { id: string; username: string; name: string; role: any; icon_url?: string }
  ): Promise<{ shared: boolean; shares_count: number }> {
    const target = await MongoPublicationRepository.findById(publicationId);
    if (!target) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('publications');
    const uVars = MongoIdHelper.idVariants(user.id);
    const pVars = MongoIdHelper.idVariants(publicationId);
    const existing = await col.findOne({
      type: 'shared',
      $or: [{ 'author.id': { $in: uVars } }, { 'author._id': { $in: uVars } }],
      $and: [{ $or: [{ target_publication_id: { $in: pVars } }, { parent_publication_id: { $in: pVars } }] }],
    });
    if (existing) return this.unshare(publicationId, user.id);

    const sender = await MongoMemberRepository.findById(user.id);
    const sharePost = {
      id: uuidv7(),
      author: {
        id: user.id,
        username: user.username,
        name: sender?.name || user.name || user.username,
        role: user.role,
        icon_url: sender?.icon_url || `/api/members/${user.username}/icon`,
        banner_url: null,
      },
      type: 'shared' as const,
      content: null,
      created_at: new Date().toISOString(),
      parent_publication_id: publicationId,
      root_publication_id: target.root_publication_id || publicationId,
      target_publication_id: publicationId,
      images: [], media_urls: [], upvotes_count: 0, replies_count: 0, quotes_count: 0, shares_count: 0,
    };

    await MongoPublicationRepository.create(sharePost as any);
    await MongoPublicationRepository.incrementCounters(publicationId, { shares_count: 1 });

    if (target.author.id !== user.id) {
      const notif = {
        id: uuidv7(),
        recipient_id: target.author.id,
        sender: { ...sharePost.author, banner_url: null },
        type: 'share' as any,
        target_publication_id: publicationId,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      };
      await MongoNotificationRepository.create(notif);
      SocketGateway.sendNotification(target.author.id, notif);
      const snippet = PublicationSnippetHelper.extractSnippet(target);
      WebPushService.sendPushToUser(
        target.author.id,
        { title: `${user.name} compartió`, body: snippet, url: `/publication/${publicationId}` },
        'shares'
      ).catch(() => {});
    }

    return { shared: true, shares_count: target.shares_count + 1 };
  }

  public static async unshare(pubId: string, userId: string): Promise<{ shared: boolean; shares_count: number }> {
    const target = await MongoPublicationRepository.findById(pubId);
    if (!target) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('publications');
    const uVars = MongoIdHelper.idVariants(userId);
    const pVars = MongoIdHelper.idVariants(pubId);
    const result = await col.deleteOne({
      type: 'shared',
      $or: [{ 'author.id': { $in: uVars } }, { 'author._id': { $in: uVars } }],
      $and: [{ $or: [{ target_publication_id: { $in: pVars } }, { parent_publication_id: { $in: pVars } }] }],
    });

    if (result.deletedCount > 0) {
      await MongoPublicationRepository.incrementCounters(pubId, { shares_count: -1 });
      return { shared: false, shares_count: Math.max(0, target.shares_count - 1) };
    }
    return { shared: false, shares_count: target.shares_count };
  }
}
