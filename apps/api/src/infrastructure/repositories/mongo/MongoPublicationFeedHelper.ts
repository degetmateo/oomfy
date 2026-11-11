import { Collection, Filter } from 'mongodb';
import { Publication } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { MongoPublicationLikedHelper } from './MongoPublicationLikedHelper.js';
import type { FeedParams } from './MongoPublicationRepository.js';

export class MongoPublicationFeedHelper {
  public static async findFeed(col: Collection<any>, params: FeedParams): Promise<Publication[]> {
    if (params.likedBy) return MongoPublicationLikedHelper.findLikedFeed(col, params);

    const query: Filter<any> = {};
    if (params.olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(params.olderId));
      if (olderDoc?.created_at) {
        const olderDate = new Date(olderDoc.created_at);
        query.$and = [
          ...(query.$and || []),
          { $or: [{ created_at: { $lt: olderDate } }, { created_at: { $lt: olderDate.toISOString() } }] },
        ];
      } else {
        query._id = { $lt: MongoIdHelper.toMongoId(params.olderId) };
      }
    }

    if (params.authorUsername) {
      const safeAuthor = MongoIdHelper.escapeRegex(params.authorUsername);
      query['author.username'] = { $regex: new RegExp(`^${safeAuthor}$`, 'i') };
    }
    if (params.type === 'posts') query.type = { $in: ['default', 'quote', 'shared'] };
    else if (params.type) query.type = params.type;
    else if (!params.authorUsername && !params.query) query.type = { $in: ['default', 'quote'] };

    if (params.query) query.content = { $regex: MongoIdHelper.escapeRegex(params.query), $options: 'i' };
    if (params.hasMedia) query['images.0'] = { $exists: true };

    if (params.since || params.until) {
      query.created_at = query.created_at || {};
      if (params.since) query.created_at.$gte = new Date(params.since);
      if (params.until) query.created_at.$lte = new Date(params.until);
    }

    const limit = params.limit ? Number(params.limit) : 20;
    const docs = await col.find(query).sort({ created_at: -1, _id: -1 }).limit(limit).toArray();
    const populated = await PublicationTargetPopulator.populate(docs.map(PublicationMapper.toDomain));
    return PublicationInteractionDecorator.decorate(populated, params.userId);
  }
}

