import { v7 as uuidv7 } from 'uuid';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { NotFoundError } from '../../errors/AppError.js';

export class ShareService {
  private static getPublicationsCol() {
    return MongoDatabase.getDb().collection<any>('publications');
  }

  public static async share(
    pubId: string,
    user: { id: string; username: string; name: string; role: string }
  ): Promise<{ shared: boolean; shares_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = this.getPublicationsCol();
    const userVariants = MongoIdHelper.idVariants(user.id);
    const pubVariants = MongoIdHelper.idVariants(pubId);

    const existing = await col.findOne({
      type: 'shared',
      $and: [
        { $or: [{ 'author.id': { $in: userVariants } }, { 'author._id': { $in: userVariants } }] },
        { $or: [{ parent_publication_id: { $in: pubVariants } }, { target_publication_id: { $in: pubVariants } }] },
      ],
    });
    if (existing) {
      return { shared: true, shares_count: pub.shares_count || 0 };
    }

    const shareDoc = {
      id: uuidv7(),
      author: { id: user.id, username: user.username, name: user.name, role: user.role as any, icon_url: `/members/${user.username}/icon`, banner_url: `/members/${user.username}/banner` },
      type: 'shared' as const,
      content: null,
      created_at: new Date().toISOString(),
      parent_publication_id: pubId,
      root_publication_id: null,
      thread_ids: [],
      images: [],
      embeds: [],
      upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
      target_publication: pub,
    };

    await MongoPublicationRepository.create(shareDoc);
    await MongoPublicationRepository.incrementCounters(pubId, { shares_count: 1 });
    await NotificationDispatcher.dispatch({
      recipientId: pub.author.id,
      sender: user,
      type: 'share',
      targetPublicationId: pubId,
      push: {
        title: `${user.name} compartió`,
        body: pub.content ? `"${pub.content.slice(0, 80)}"` : 'tu publicación.',
        url: `/publication/${pubId}`,
        category: 'shares',
      },
    });

    return { shared: true, shares_count: (pub.shares_count || 0) + 1 };
  }

  public static async unshare(pubId: string, userId: string): Promise<{ shared: boolean; shares_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const userVariants = MongoIdHelper.idVariants(userId);
    const pubVariants = MongoIdHelper.idVariants(pubId);

    const res = await this.getPublicationsCol().deleteMany({
      type: 'shared',
      $and: [
        { $or: [{ 'author.id': { $in: userVariants } }, { 'author._id': { $in: userVariants } }] },
        { $or: [{ parent_publication_id: { $in: pubVariants } }, { target_publication_id: { $in: pubVariants } }] },
      ],
    });

    const deletedCount = res.deletedCount ?? 0;
    if (deletedCount > 0) await MongoPublicationRepository.incrementCounters(pubId, { shares_count: -1 });
    const currentCount = pub.shares_count || 0;
    return { shared: false, shares_count: deletedCount > 0 ? Math.max(0, currentCount - 1) : currentCount };
  }
}
