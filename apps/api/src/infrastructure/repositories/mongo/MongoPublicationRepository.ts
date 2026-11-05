import { Filter } from 'mongodb';
import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { PublicationThreadResolver } from './PublicationThreadResolver.js';

export interface FeedParams {
  olderId?: string | null;
  authorUsername?: string | null;
  query?: string | null;
  type?: string | null;
  likedBy?: string | null;
  since?: string | null;
  until?: string | null;
  hasMedia?: boolean | null;
  limit?: number;
  userId?: string;
}

export class MongoPublicationRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('publications');
  }

  public static async create(publication: Publication): Promise<Publication> {
    const col = this.getCollection();
    const createdAtDate = publication.created_at ? new Date(publication.created_at) : new Date();
    const pubMongoId = MongoIdHelper.toMongoId(publication.id);
    const parentMongoId = publication.parent_publication_id
      ? MongoIdHelper.toMongoId(publication.parent_publication_id)
      : null;
    const rootMongoId = publication.root_publication_id
      ? MongoIdHelper.toMongoId(publication.root_publication_id)
      : null;
    const authorMongoId = publication.author?.id
      ? MongoIdHelper.toMongoId(publication.author.id)
      : null;
    const threadUuids = publication.thread_ids?.map((t) => MongoIdHelper.toMongoId(t)) || [];

    const doc = {
      ...publication,
      _id: pubMongoId,
      id: pubMongoId,
      parent_publication_id: parentMongoId,
      target_publication_id: parentMongoId,
      root_publication_id: rootMongoId,
      thread_ids: threadUuids,
      author: {
        ...publication.author,
        _id: authorMongoId,
        id: authorMongoId,
      },
      created_at: createdAtDate,
      upvote_count: publication.upvotes_count || 0,
      share_count: publication.shares_count || 0,
      comment_count: publication.comments_count || 0,
      quote_count: publication.quotes_count || 0,
    };
    await col.insertOne(doc);
    return publication;
  }

  public static async findById(id: string, userId?: string): Promise<Publication | null> {
    const col = this.getCollection();
    const doc = await col.findOne(MongoIdHelper.idFilter(id));
    if (!doc) return null;
    const domain = PublicationMapper.toDomain(doc);
    const [populated] = await PublicationTargetPopulator.populate([domain]);
    const [decorated] = await PublicationInteractionDecorator.decorate([populated], userId);
    return decorated;
  }

  public static async findFeed(params: FeedParams): Promise<Publication[]> {
    const col = this.getCollection();

    if (params.likedBy) {
      const userDoc = await MongoDatabase.getDb().collection('members').findOne({
        username: { $regex: new RegExp(`^${params.likedBy}$`, 'i') },
      });
      if (!userDoc) return [];
      const userIds = [userDoc.id, userDoc._id ? userDoc._id.toString() : null].filter(Boolean);
      const userVariants = userIds.flatMap((id) => MongoIdHelper.idVariants(id));

      const upvoteQuery: any = { user_id: { $in: userVariants } };
      if (params.olderId) {
        const olderUpvote = await MongoDatabase.getDb().collection('upvotes').findOne({
          publication_id: { $in: MongoIdHelper.idVariants(params.olderId) },
          user_id: { $in: userVariants },
        });
        if (olderUpvote?.created_at) {
          const olderDate = new Date(olderUpvote.created_at);
          const olderIso = olderDate.toISOString();
          upvoteQuery.$or = [
            { created_at: { $lt: olderUpvote.created_at } },
            { created_at: { $lt: olderDate } },
            { created_at: { $lt: olderIso } },
          ];
        } else {
          return [];
        }
      }

      const limit = params.limit ? Number(params.limit) : 20;
      const upvotes = await MongoDatabase.getDb().collection('upvotes')
        .find(upvoteQuery)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();

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
        if (post && !orderedList.some((p) => p.id === post.id)) {
          orderedList.push(post);
        }
      }

      const populated = await PublicationTargetPopulator.populate(orderedList);
      return PublicationInteractionDecorator.decorate(populated, params.userId);
    }

    const query: Filter<any> = {};

    if (params.olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(params.olderId));
      if (olderDoc?.created_at) {
        const olderDate = new Date(olderDoc.created_at);
        const olderIso = olderDate.toISOString();
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { created_at: { $lt: olderDate } },
              { created_at: { $lt: olderIso } },
            ],
          },
        ];
      } else {
        query._id = { $lt: MongoIdHelper.toMongoId(params.olderId) };
      }
    }
    if (params.authorUsername) query['author.username'] = { $regex: new RegExp(`^${params.authorUsername}$`, 'i') };
    if (params.type === 'posts') {
      query.type = { $in: ['default', 'quote', 'shared'] };
    } else if (params.type) {
      query.type = params.type;
    } else if (!params.authorUsername && !params.query) {
      query.type = { $in: ['default', 'quote'] };
    }
    if (params.query) query.content = { $regex: params.query, $options: 'i' };
    if (params.hasMedia) query['images.0'] = { $exists: true };

    if (params.since || params.until) {
      query.created_at = query.created_at || {};
      if (params.since) query.created_at.$gte = new Date(params.since);
      if (params.until) query.created_at.$lte = new Date(params.until);
    }

    const limit = params.limit ? Number(params.limit) : 20;
    const docs = await col.find(query).sort({ created_at: -1, _id: -1 }).limit(limit).toArray();
    const domainPosts = docs.map(PublicationMapper.toDomain);
    const populated = await PublicationTargetPopulator.populate(domainPosts);
    return PublicationInteractionDecorator.decorate(populated, params.userId);
  }

  public static async findAncestors(publication: Publication, userId?: string, maxLevels: number = 20): Promise<Publication[]> {
    return PublicationThreadResolver.findAncestors(publication, userId, maxLevels);
  }

  public static async findReplies(id: string, userId?: string, limit: number = 50): Promise<Publication[]> {
    const col = this.getCollection();
    const targetVariants = MongoIdHelper.idVariants(id);
    const docs = await col
      .find({
        type: 'reply',
        $or: [
          { target_publication_id: { $in: targetVariants } },
          { parent_publication_id: { $in: targetVariants } },
          { old_parent_publication_id: parseInt(id, 10) || -1 },
        ],
      })
      .sort({ created_at: 1 })
      .limit(limit)
      .toArray();

    const domainPosts = docs.map(PublicationMapper.toDomain);
    const populated = await PublicationTargetPopulator.populate(domainPosts);
    return PublicationInteractionDecorator.decorate(populated, userId);
  }

  public static async findThread(id: string, userId?: string): Promise<Publication[]> {
    return this.findReplies(id, userId);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'upvotes_count' | 'shares_count' | 'quotes_count' | 'comments_count', number>>
  ): Promise<void> {
    const col = this.getCollection();
    const mongoInc: any = {};
    if (inc.upvotes_count) {
      mongoInc.upvotes_count = inc.upvotes_count;
      mongoInc.upvote_count = inc.upvotes_count;
    }
    if (inc.shares_count) {
      mongoInc.shares_count = inc.shares_count;
      mongoInc.share_count = inc.shares_count;
    }
    if (inc.comments_count) {
      mongoInc.comments_count = inc.comments_count;
      mongoInc.comment_count = inc.comments_count;
    }
    await col.updateOne(MongoIdHelper.idFilter(id), { $inc: mongoInc });
  }

  public static async deleteById(id: string): Promise<boolean> {
    const col = this.getCollection();
    const result = await col.deleteOne(MongoIdHelper.idFilter(id));
    return result.deletedCount > 0;
  }
}
