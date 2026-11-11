import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';
import { PublicationInteractionDecorator } from './PublicationInteractionDecorator.js';
import { PublicationTargetPopulator } from './PublicationTargetPopulator.js';
import { PublicationThreadResolver } from './PublicationThreadResolver.js';
import { MongoPublicationFeedHelper } from './MongoPublicationFeedHelper.js';

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

  public static findFeed(params: FeedParams): Promise<Publication[]> {
    return MongoPublicationFeedHelper.findFeed(this.getCollection(), params);
  }

  public static findAncestors(publication: Publication, userId?: string, maxLevels: number = 20): Promise<Publication[]> {
    return PublicationThreadResolver.findAncestors(publication, userId, maxLevels);
  }

  public static async findReplies(id: string, userId?: string, limit: number = 50): Promise<Publication[]> {
    const targetVariants = MongoIdHelper.idVariants(id);
    const docs = await this.getCollection()
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
    const populated = await PublicationTargetPopulator.populate(docs.map(PublicationMapper.toDomain));
    return PublicationInteractionDecorator.decorate(populated, userId);
  }

  public static findThread(id: string, userId?: string): Promise<Publication[]> {
    return this.findReplies(id, userId);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'upvotes_count' | 'shares_count' | 'quotes_count' | 'comments_count', number>>
  ): Promise<void> {
    const mongoInc: any = {};
    if (inc.upvotes_count) { mongoInc.upvotes_count = inc.upvotes_count; mongoInc.upvote_count = inc.upvotes_count; }
    if (inc.shares_count) { mongoInc.shares_count = inc.shares_count; mongoInc.share_count = inc.shares_count; }
    if (inc.comments_count) { mongoInc.comments_count = inc.comments_count; mongoInc.comment_count = inc.comments_count; }
    await this.getCollection().updateOne(MongoIdHelper.idFilter(id), { $inc: mongoInc });
  }

  public static async deleteById(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne(MongoIdHelper.idFilter(id));
    return result.deletedCount > 0;
  }
}
