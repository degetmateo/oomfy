import { v7 as uuidv7 } from 'uuid';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { NotFoundError } from '../../errors/AppError.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class UpvoteService {
  public static async upvote(
    publicationId: string,
    user: { id: string; username: string; name: string; role: any; icon_url?: string }
  ): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(publicationId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('upvotes');
    const existing = await col.findOne({ publication_id: publicationId, user_id: user.id });

    if (!existing) {
      await col.insertOne({
        id: uuidv7(),
        publication_id: publicationId,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });
      await MongoPublicationRepository.incrementCounters(publicationId, { upvotes_count: 1 });
      await MongoDatabase.getDb().collection('members').updateOne(
        MongoIdHelper.idFilter(pub.author.id),
        { $inc: { upvote_count: 1 } }
      );

      if (pub.author.id !== user.id) {
        const notif = {
          id: uuidv7(),
          recipient_id: pub.author.id,
          sender: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            icon_url: user.icon_url || null,
            banner_url: null,
          },
          type: 'upvote' as const,
          target_publication_id: publicationId,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
        };
        await MongoNotificationRepository.create(notif);
        SocketGateway.sendNotification(pub.author.id, notif);
      }
      return { upvoted: true, upvotes_count: pub.upvotes_count + 1 };
    }
    return this.downvote(publicationId, user.id);
  }

  public static async downvote(
    publicationId: string,
    userId: string
  ): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(publicationId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('upvotes');
    const result = await col.deleteOne({ publication_id: publicationId, user_id: userId });

    if (result.deletedCount > 0) {
      await MongoPublicationRepository.incrementCounters(publicationId, { upvotes_count: -1 });
      await MongoDatabase.getDb().collection('members').updateOne(
        MongoIdHelper.idFilter(pub.author.id),
        { $inc: { upvote_count: -1 } }
      );
      return { upvoted: false, upvotes_count: Math.max(0, pub.upvotes_count - 1) };
    }
    return { upvoted: false, upvotes_count: pub.upvotes_count };
  }
}
