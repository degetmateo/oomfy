import { v7 as uuidv7 } from 'uuid';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { NotFoundError } from '../../errors/AppError.js';

export class UpvoteService {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('upvotes');
  }

  public static async upvote(
    pubId: string,
    user: { id: string; username: string; name: string; role: string }
  ): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = this.getCollection();
    const userVariants = MongoIdHelper.idVariants(user.id);
    const pubVariants = MongoIdHelper.idVariants(pubId);

    const existing = await col.findOne({ user_id: { $in: userVariants }, publication_id: { $in: pubVariants } });
    const currentUpvotes = Math.max(0, pub.upvotes_count || 0);
    if (existing) {
      return { upvoted: true, upvotes_count: currentUpvotes };
    }

    const idVal = uuidv7();
    try {
      await col.insertOne({
        _id: MongoIdHelper.toMongoId(idVal),
        id: idVal,
        user_id: MongoIdHelper.toMongoId(user.id),
        publication_id: MongoIdHelper.toMongoId(pubId),
        created_at: new Date(),
      });
    } catch (err: any) {
      if (err?.code === 11000) return { upvoted: true, upvotes_count: currentUpvotes };
      throw err;
    }

    await MongoPublicationRepository.incrementCounters(pubId, { upvotes_count: 1 });
    await NotificationDispatcher.dispatch({
      recipientId: pub.author.id,
      sender: user,
      type: 'upvote',
      targetPublicationId: pubId,
      push: {
        title: `${user.name} le dio me gusta`,
        body: pub.content ? `"${pub.content.slice(0, 80)}"` : 'a tu publicación.',
        url: `/publication/${pubId}`,
        category: 'upvotes',
      },
    });

    return { upvoted: true, upvotes_count: currentUpvotes + 1 };
  }

  public static async downvote(pubId: string, userId: string): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const res = await this.getCollection().deleteMany({
      user_id: { $in: MongoIdHelper.idVariants(userId) },
      publication_id: { $in: MongoIdHelper.idVariants(pubId) },
    });

    const deletedCount = res.deletedCount ?? 0;
    if (deletedCount > 0) {
      await MongoPublicationRepository.incrementCounters(pubId, { upvotes_count: -1 });
    }

    const currentCount = Math.max(0, pub.upvotes_count || 0);
    return { upvoted: false, upvotes_count: deletedCount > 0 ? Math.max(0, currentCount - 1) : currentCount };
  }
}
