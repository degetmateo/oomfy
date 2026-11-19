import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { PublicationThreadResolver } from './PublicationThreadResolver.js';
import { PublicationSubthreadResolver } from './PublicationSubthreadResolver.js';
import { MongoPublicationFeedHelper } from './MongoPublicationFeedHelper.js';

export interface FeedParams {
  olderId?: string | null;
  authorUsername?: string | null;
  query?: string | null;
  feed?: 'global' | 'following' | null;
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
    await this.getCollection().insertOne(PublicationMapper.toPersistence(publication));
    return publication;
  }

  public static async findById(id: string, userId?: string): Promise<Publication | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id));
    if (!doc) return null;
    const [populated] = await PublicationTargetPopulator.populate([PublicationMapper.toDomain(doc)]);
    const [decorated] = await PublicationInteractionDecorator.decorate([populated], userId);
    return decorated;
  }

  public static async findManyByIds(ids: string[], userId?: string): Promise<Publication[]> {
    if (ids.length === 0) return [];
    const filters = ids.flatMap((id) => MongoIdHelper.idFilter(id).$or);
    const docs = await this.getCollection().find({ $or: filters }).toArray();
    const populated = await PublicationTargetPopulator.populate(docs.map(PublicationMapper.toDomain));
    return PublicationInteractionDecorator.decorate(populated, userId);
  }

  public static findFeed(params: FeedParams): Promise<Publication[]> {
    return MongoPublicationFeedHelper.findFeed(this.getCollection(), params);
  }

  public static findAncestors(publication: Publication, userId?: string, maxLevels: number = 20): Promise<Publication[]> {
    return PublicationThreadResolver.findAncestors(publication, userId, maxLevels);
  }

  public static findReplies(id: string, userId?: string, limit: number = 50, parentPub?: Publication): Promise<Publication[]> {
    return PublicationSubthreadResolver.findRepliesWithSubthreads(this.getCollection(), id, userId, limit, parentPub);
  }

  public static findSubthread(pub: Publication, mode: 'author' | 'subthread', offset = 0, limit = 5, userId?: string) {
    return PublicationSubthreadResolver.getPaginatedSubthread(this.getCollection(), pub, mode, offset, limit, userId);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'upvotes_count' | 'shares_count' | 'quotes_count' | 'comments_count', number>>
  ): Promise<void> {
    const mongoInc: any = {};
    if (inc.upvotes_count) { mongoInc.upvotes_count = inc.upvotes_count; mongoInc.upvote_count = inc.upvotes_count; }
    if (inc.shares_count) { mongoInc.shares_count = inc.shares_count; mongoInc.share_count = inc.shares_count; }
    if (inc.quotes_count) { mongoInc.quotes_count = inc.quotes_count; mongoInc.quote_count = inc.quotes_count; }
    if (inc.comments_count) { mongoInc.comments_count = inc.comments_count; mongoInc.comment_count = inc.comments_count; }
    if (Object.keys(mongoInc).length > 0) {
      const filter = MongoIdHelper.idFilter(id);
      await this.getCollection().updateOne(filter, { $inc: mongoInc });
      if (Object.values(mongoInc).some((v) => typeof v === 'number' && v < 0)) {
        await this.getCollection().updateOne(filter, {
          $max: {
            upvotes_count: 0, upvote_count: 0, shares_count: 0, share_count: 0,
            quotes_count: 0, quote_count: 0, comments_count: 0, comment_count: 0,
          },
        });
      }
    }
  }

  public static async deleteById(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne(MongoIdHelper.idFilter(id));
    return result.deletedCount > 0;
  }
}
