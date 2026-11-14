import { Publication, PublicUser } from '@oomfy/shared';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { PublicationTargetPopulator } from '../../infrastructure/repositories/mongo/PublicationTargetPopulator.js';
import { PublicationInteractionDecorator } from '../../infrastructure/repositories/mongo/PublicationInteractionDecorator.js';
import { NotFoundError } from '../../errors/AppError.js';

export class InteractionQueryService {
  private static async ensurePublicationExists(pubId: string): Promise<void> {
    const pub = await MongoPublicationRepository.findById(pubId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');
  }

  public static async getLikes(pubId: string, limit = 20, offset = 0, viewerId?: string): Promise<PublicUser[]> {
    await this.ensurePublicationExists(pubId);
    const col = MongoDatabase.getDb().collection<any>('upvotes');
    const docs = await col.find({ publication_id: { $in: MongoIdHelper.idVariants(pubId) } })
      .sort({ created_at: -1, _id: -1 }).skip(offset).limit(limit).toArray();
    const userIds = docs.map((d: any) => String(d.user_id)).filter(Boolean);
    return this.mapUsers(userIds, viewerId);
  }

  public static async getShares(pubId: string, limit = 20, offset = 0, viewerId?: string): Promise<PublicUser[]> {
    await this.ensurePublicationExists(pubId);
    const col = MongoDatabase.getDb().collection<any>('publications');
    const pubVariants = MongoIdHelper.idVariants(pubId);
    const docs = await col.find({
      type: 'shared',
      $or: [{ parent_publication_id: { $in: pubVariants } }, { target_publication_id: { $in: pubVariants } }],
    }).sort({ created_at: -1, _id: -1 }).skip(offset).limit(limit).toArray();
    const userIds = docs.map((d: any) => String(d.author?.id || d.author?._id || '')).filter(Boolean);
    return this.mapUsers(userIds, viewerId);
  }

  public static async getQuotes(pubId: string, limit = 20, offset = 0, olderId?: string, viewerId?: string): Promise<Publication[]> {
    await this.ensurePublicationExists(pubId);
    const col = MongoDatabase.getDb().collection<any>('publications');
    const pubVariants = MongoIdHelper.idVariants(pubId);
    const filter: any = {
      type: 'quote',
      $or: [
        { parent_publication_id: { $in: pubVariants } },
        { target_publication_id: { $in: pubVariants } },
        { 'target_publication.id': { $in: pubVariants } },
      ],
    };

    if (olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(olderId));
      if (olderDoc?.created_at) filter.created_at = { $lt: new Date(olderDoc.created_at) };
      else filter._id = { $lt: MongoIdHelper.toMongoId(olderId) };
    }

    const cursor = col.find(filter).sort({ created_at: -1, _id: -1 });
    if (!olderId && offset > 0) cursor.skip(offset);
    const docs = await cursor.limit(limit).toArray();

    const populated = await PublicationTargetPopulator.populate(docs.map(PublicationMapper.toDomain));
    return PublicationInteractionDecorator.decorate(populated, viewerId);
  }

  private static async mapUsers(userIds: string[], viewerId?: string): Promise<PublicUser[]> {
    if (userIds.length === 0) return [];
    const members = await MongoMemberRepository.findManyByIds(userIds);
    const memberMap = new Map<string, PublicUser>();
    for (const m of members) {
      memberMap.set(String(m.id), m);
      memberMap.set(String(m.id).toLowerCase(), m);
    }
    const followingSet = viewerId ? await MongoFollowRepository.filterFollowing(viewerId, userIds) : new Set<string>();

    const result: PublicUser[] = [];
    const seen = new Set<string>();
    for (const uid of userIds) {
      if (seen.has(uid)) continue;
      seen.add(uid);
      const m = memberMap.get(uid) || memberMap.get(uid.toLowerCase());
      if (m) result.push({ ...m, is_following: viewerId ? followingSet.has(String(m.id)) : false });
    }
    return result;
  }
}
