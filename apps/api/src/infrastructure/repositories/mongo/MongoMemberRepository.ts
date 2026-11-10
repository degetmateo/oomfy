import { PublicUser } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoFollowRepository } from './MongoFollowRepository.js';
import { MongoMemberMapper } from './MongoMemberMapper.js';

export class MongoMemberRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('members');
  }

  public static async createOrUpdate(user: Partial<PublicUser> & { id: string; username: string }): Promise<void> {
    await this.getCollection().updateOne(
      MongoIdHelper.idFilter(user.id),
      MongoMemberMapper.buildUpsertOps(user),
      { upsert: true }
    );
  }

  public static async acceptTerms(userId: string): Promise<PublicUser | null> {
    const now = new Date().toISOString();
    await this.getCollection().updateOne(
      MongoIdHelper.idFilter(userId),
      { $set: { terms_accepted: true, terms_accepted_at: now } }
    );
    return this.findById(userId);
  }

  public static async findByUsername(username: string): Promise<PublicUser | null> {
    const doc = await this.getCollection().findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    return doc ? MongoMemberMapper.toDomain(doc) : null;
  }

  public static async findById(id: string): Promise<PublicUser | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id));
    return doc ? MongoMemberMapper.toDomain(doc) : null;
  }

  public static async findManyByIds(ids: string[]): Promise<PublicUser[]> {
    if (ids.length === 0) return [];
    const allFilters = ids.flatMap((id) => MongoIdHelper.idFilter(id).$or);
    const docs = await this.getCollection().find({ $or: allFilters }).toArray();
    return docs.map(MongoMemberMapper.toDomain);
  }

  public static async getRawMediaUrls(username: string): Promise<{ icon_url: string | null; banner_url: string | null }> {
    const doc = await this.getCollection().findOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { projection: { icon_url: 1, 'icon.url': 1, banner_url: 1, 'banner.url': 1 } }
    );
    return { icon_url: doc?.icon_url || doc?.icon?.url || null, banner_url: doc?.banner_url || doc?.banner?.url || null };
  }

  public static async search(term: string, limit: number = 20): Promise<PublicUser[]> {
    const regex = new RegExp(term, 'i');
    const docs = await this.getCollection().find({ $or: [{ username: regex }, { name: regex }, { bio: regex }] }).limit(limit).toArray();
    return docs.map(MongoMemberMapper.toDomain);
  }

  public static async findSuggested(limit: number = 5, currentUserId?: string): Promise<PublicUser[]> {
    const query: any = {};
    if (currentUserId) {
      const excludeIds: any[] = [currentUserId];
      const mongoId = MongoIdHelper.toMongoId(currentUserId);
      if (mongoId) excludeIds.push(mongoId);
      const followedIds = await MongoFollowRepository.getFollowedUserIds(currentUserId);
      for (const fid of followedIds) {
        excludeIds.push(fid);
        const fMongoId = MongoIdHelper.toMongoId(fid);
        if (fMongoId) excludeIds.push(fMongoId);
      }
      query._id = { $nin: excludeIds };
      query.id = { $nin: excludeIds.map(String) };
    }
    const docs = await this.getCollection().find(query).sort({ follower_count: -1, publication_count: -1 }).limit(limit).toArray();
    return docs.map(MongoMemberMapper.toDomain);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'follower_count' | 'followed_count' | 'publication_count', number>>
  ): Promise<void> {
    await this.getCollection().updateOne(MongoIdHelper.idFilter(id), { $inc: inc });
  }
}
