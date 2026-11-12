import { PublicUser } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoFollowRepository } from './MongoFollowRepository.js';
import { MongoMemberMapper } from './MongoMemberMapper.js';

const ACTIVE_MEMBER_FILTER = { status: { $nin: ['suspended', 'pending'] } };

export class MongoMemberRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('members');
  }

  public static async createOrUpdate(user: Partial<PublicUser> & { id: string; username: string }): Promise<void> {
    await this.getCollection().updateOne(MongoIdHelper.idFilter(user.id), MongoMemberMapper.buildUpsertOps(user), { upsert: true });
  }

  public static async acceptTerms(userId: string): Promise<PublicUser | null> {
    await this.getCollection().updateOne(
      MongoIdHelper.idFilter(userId),
      { $set: { terms_accepted: true, terms_accepted_at: new Date().toISOString() } }
    );
    return this.findById(userId);
  }

  public static async findByUsername(username: string): Promise<PublicUser | null> {
    const doc = await this.getCollection().findOne({
      username: { $regex: new RegExp(`^${MongoIdHelper.escapeRegex(username)}$`, 'i') },
      ...ACTIVE_MEMBER_FILTER,
    });
    return doc ? MongoMemberMapper.toDomain(doc) : null;
  }

  public static async findById(id: string): Promise<PublicUser | null> {
    const doc = await this.getCollection().findOne({ ...MongoIdHelper.idFilter(id), ...ACTIVE_MEMBER_FILTER });
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
      { username: { $regex: new RegExp(`^${MongoIdHelper.escapeRegex(username)}$`, 'i') }, ...ACTIVE_MEMBER_FILTER },
      { projection: { icon_url: 1, 'icon.url': 1, banner_url: 1, 'banner.url': 1 } }
    );
    return { icon_url: doc?.icon_url || doc?.icon?.url || null, banner_url: doc?.banner_url || doc?.banner?.url || null };
  }

  public static async search(term: string, limit: number = 20): Promise<PublicUser[]> {
    const regex = new RegExp(MongoIdHelper.escapeRegex(term), 'i');
    const safeLimit = Math.min(Math.max(1, limit || 20), 50);
    const docs = await this.getCollection()
      .find({ $and: [ACTIVE_MEMBER_FILTER, { $or: [{ username: regex }, { name: regex }, { bio: regex }] }] })
      .limit(safeLimit)
      .toArray();
    return docs.map(MongoMemberMapper.toDomain);
  }

  public static async findSuggested(limit: number = 5, currentUserId?: string): Promise<PublicUser[]> {
    const query: any = { ...ACTIVE_MEMBER_FILTER };
    if (currentUserId) {
      const excludeIds: any[] = [currentUserId];
      const mongoId = MongoIdHelper.toMongoId(currentUserId);
      if (mongoId) excludeIds.push(mongoId);
      for (const fid of await MongoFollowRepository.getFollowedUserIds(currentUserId)) {
        excludeIds.push(fid);
        const fMongoId = MongoIdHelper.toMongoId(fid);
        if (fMongoId) excludeIds.push(fMongoId);
      }
      query._id = { $nin: excludeIds };
      query.id = { $nin: excludeIds.map(String) };
    }
    const safeLimit = Math.min(Math.max(1, limit || 5), 30);
    const docs = await this.getCollection().find(query).sort({ follower_count: -1, publication_count: -1 }).limit(safeLimit).toArray();
    return docs.map(MongoMemberMapper.toDomain);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'follower_count' | 'followed_count' | 'publication_count', number>>
  ): Promise<void> {
    const filter = MongoIdHelper.idFilter(id);
    await this.getCollection().updateOne(filter, { $inc: inc });
    if (Object.values(inc).some((v) => typeof v === 'number' && v < 0)) {
      await this.getCollection().updateOne(filter, {
        $max: { follower_count: 0, followed_count: 0, publication_count: 0 },
      });
    }
  }

  public static async deleteById(id: string): Promise<void> {
    await this.getCollection().deleteOne(MongoIdHelper.idFilter(id));
  }
}
