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

export class UpvoteService {
  public static async upvote(
    pubId: string,
    user: { id: string; username: string; name: string; role: any; icon_url?: string }
  ): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('upvotes');
    const existing = await col.findOne({
      publication_id: { $in: MongoIdHelper.idVariants(pubId) },
      user_id: { $in: MongoIdHelper.idVariants(user.id) },
    });

    if (!existing) {
      const upvoteId = uuidv7();
      const upvoteUuid = MongoIdHelper.toMongoId(upvoteId);
      await col.insertOne({
        _id: upvoteUuid,
        id: upvoteUuid,
        publication_id: MongoIdHelper.toMongoId(pubId),
        user_id: MongoIdHelper.toMongoId(user.id),
        created_at: new Date().toISOString(),
      });
      await MongoPublicationRepository.incrementCounters(pubId, { upvotes_count: 1 });
      await MongoDatabase.getDb().collection('members').updateOne(
        MongoIdHelper.idFilter(pub.author.id),
        { $inc: { upvote_count: 1 } }
      );

      if (pub.author.id !== user.id) {
        const sender = await MongoMemberRepository.findById(user.id);
        const notif = {
          id: uuidv7(),
          recipient_id: pub.author.id,
          sender: {
            id: user.id,
            username: user.username,
            name: sender?.name || user.name || user.username,
            role: user.role,
            icon_url: sender?.icon_url || `/members/${user.username}/icon`,
            banner_url: null,
          },
          type: 'upvote' as const,
          target_publication_id: pubId,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
        };
        await MongoNotificationRepository.create(notif);
        SocketGateway.sendNotification(pub.author.id, notif);
        const snippet = PublicationSnippetHelper.extractSnippet(pub);
        WebPushService.sendPushToUser(
          pub.author.id,
          {
            title: `${user.name} indicó que le gusta`,
            body: snippet,
            url: `/publication/${pubId}`,
          },
          'upvotes'
        ).catch(() => {});
      }
      return { upvoted: true, upvotes_count: pub.upvotes_count + 1 };
    }
    return this.downvote(pubId, user.id);
  }

  public static async downvote(pubId: string, userId: string): Promise<{ upvoted: boolean; upvotes_count: number }> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');

    const col = MongoDatabase.getDb().collection('upvotes');
    const result = await col.deleteOne({
      publication_id: { $in: MongoIdHelper.idVariants(pubId) },
      user_id: { $in: MongoIdHelper.idVariants(userId) },
    });

    if (result.deletedCount > 0) {
      await MongoPublicationRepository.incrementCounters(pubId, { upvotes_count: -1 });
      await MongoDatabase.getDb().collection('members').updateOne(
        MongoIdHelper.idFilter(pub.author.id),
        { $inc: { upvote_count: -1 } }
      );
      return { upvoted: false, upvotes_count: Math.max(0, pub.upvotes_count - 1) };
    }
    return { upvoted: false, upvotes_count: pub.upvotes_count };
  }
}
