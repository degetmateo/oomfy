import { v7 as uuidv7 } from 'uuid';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
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
    const existing = await col.findOne({
      type: 'shared',
      'author.id': user.id,
      $or: [{ target_publication_id: MongoIdHelper.toMongoId(publicationId) }, { parent_publication_id: publicationId }],
    });

    if (existing) {
      return this.unshare(publicationId, user.id);
    }

    const sharePost = {
      id: uuidv7(),
      author: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        icon_url: user.icon_url || null,
        banner_url: null,
      },
      type: 'shared' as const,
      content: null,
      created_at: new Date().toISOString(),
      parent_publication_id: publicationId,
      root_publication_id: target.root_publication_id || publicationId,
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
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
    }

    return { shared: true, shares_count: target.shares_count + 1 };
  }

  public static async unshare(
    publicationId: string,
    userId: string
  ): Promise<{ shared: boolean; shares_count: number }> {
    const target = await MongoPublicationRepository.findById(publicationId);
    if (!target) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('publications');
    const result = await col.deleteOne({
      type: 'shared',
      'author.id': userId,
      $or: [{ target_publication_id: MongoIdHelper.toMongoId(publicationId) }, { parent_publication_id: publicationId }],
    });

    if (result.deletedCount > 0) {
      await MongoPublicationRepository.incrementCounters(publicationId, { shares_count: -1 });
      return { shared: false, shares_count: Math.max(0, target.shares_count - 1) };
    }
    return { shared: false, shares_count: target.shares_count };
  }
}
