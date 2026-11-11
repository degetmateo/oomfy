import { Collection } from 'mongodb';
import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import type { FeedParams } from './MongoPublicationRepository.js';

export class MongoPublicationLikedHelper {
  public static async findLikedFeed(col: Collection<any>, params: FeedParams): Promise<Publication[]> {
    const db = MongoDatabase.getDb();
    const safeLikedBy = MongoIdHelper.escapeRegex(params.likedBy!);
    const userDoc = await db.collection('members').findOne({ username: { $regex: new RegExp(`^${safeLikedBy}$`, 'i') } });
    if (!userDoc) return [];

    const userIds = [userDoc.id, userDoc._id ? userDoc._id.toString() : null].filter(Boolean);
    const userVariants = userIds.flatMap((id) => MongoIdHelper.idVariants(id));
    const upvoteQuery: any = { user_id: { $in: userVariants } };

    if (params.olderId) {
      const olderUpvote = await db.collection('upvotes').findOne({
        publication_id: { $in: MongoIdHelper.idVariants(params.olderId) },
        user_id: { $in: userVariants },
      });
      if (!olderUpvote?.created_at) return [];
      const olderDate = new Date(olderUpvote.created_at);
      upvoteQuery.$or = [
        { created_at: { $lt: olderUpvote.created_at } },
        { created_at: { $lt: olderDate } },
        { created_at: { $lt: olderDate.toISOString() } },
      ];
    }

    const limit = params.limit ? Number(params.limit) : 20;
    const upvotes = await db.collection('upvotes').find(upvoteQuery).sort({ created_at: -1 }).limit(limit).toArray();
    const pubIds = upvotes.map((u: any) => u.publication_id?.toString() || u.publication_id).filter(Boolean);
    if (pubIds.length === 0) return [];

    const filters = pubIds.flatMap((id: string) => MongoIdHelper.idFilter(id).$or);
    const docs = await col.find({ $or: filters }).toArray();
    const domainMap = new Map<string, Publication>();
    for (const d of docs) {
      const domain = PublicationMapper.toDomain(d);
      domainMap.set(domain.id.toLowerCase(), domain);
      if (d.id) domainMap.set(String(d.id).toLowerCase(), domain);
      if (d._id) domainMap.set(String(d._id).toLowerCase(), domain);
      if (d.old_id) domainMap.set(String(d.old_id), domain);
    }

    const orderedList: Publication[] = [];
    for (const id of pubIds) {
      const post = domainMap.get(String(id).toLowerCase());
      if (post && !orderedList.some((p) => p.id === post.id)) orderedList.push(post);
    }
    const populated = await PublicationTargetPopulator.populate(orderedList);
    return PublicationInteractionDecorator.decorate(populated, params.userId);
  }
}

