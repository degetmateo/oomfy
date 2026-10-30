import { PublicUser } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoFollowRepository } from './MongoFollowRepository.js';

export class MongoMemberRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('members');
  }

  private static toDomain(doc: any): PublicUser {
    return {
      id: doc._id ? doc._id.toString() : doc.id,
      username: doc.username,
      name: doc.name || doc.username,
      role: doc.role || 'member',
      bio: doc.bio || null,
      location: doc.location || null,
      link: doc.link || null,
      icon_url: doc.icon?.url || doc.icon_url || null,
      banner_url: doc.banner?.url || doc.banner_url || null,
      created_at: doc.created_at || new Date().toISOString(),
      follower_count: doc.follower_count || 0,
      followed_count: doc.followed_count || 0,
      publication_count: doc.publication_count || 0,
    };
  }

  public static async createOrUpdate(user: Partial<PublicUser> & { id: string; username: string }): Promise<void> {
    const col = this.getCollection();
    const mongoId = MongoIdHelper.toMongoId(user.id);
    await col.updateOne(
      MongoIdHelper.idFilter(user.id),
      {
        $set: {
          _id: mongoId,
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          role: user.role || 'member',
          bio: user.bio || null,
          location: user.location || null,
          link: user.link || null,
          'icon.url': user.icon_url !== undefined ? user.icon_url : undefined,
          icon_url: user.icon_url !== undefined ? user.icon_url : undefined,
          'banner.url': user.banner_url !== undefined ? user.banner_url : undefined,
          banner_url: user.banner_url !== undefined ? user.banner_url : undefined,
          created_at: user.created_at || new Date().toISOString(),
        },
        $setOnInsert: { follower_count: 0, followed_count: 0, publication_count: 0 },
      },
      { upsert: true }
    );
  }

  public static async findByUsername(username: string): Promise<PublicUser | null> {
    const col = this.getCollection();
    const doc = await col.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    return doc ? this.toDomain(doc) : null;
  }

  public static async findById(id: string): Promise<PublicUser | null> {
    const col = this.getCollection();
    const doc = await col.findOne(MongoIdHelper.idFilter(id));
    return doc ? this.toDomain(doc) : null;
  }

  public static async search(term: string, limit: number = 20): Promise<PublicUser[]> {
    const col = this.getCollection();
    const regex = new RegExp(term, 'i');
    const docs = await col
      .find({ $or: [{ username: regex }, { name: regex }, { bio: regex }] })
      .limit(limit)
      .toArray();
    return docs.map(this.toDomain);
  }

  public static async findSuggested(limit: number = 5, currentUserId?: string): Promise<PublicUser[]> {
    const col = this.getCollection();
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

    const docs = await col
      .find(query)
      .sort({ follower_count: -1, publication_count: -1 })
      .limit(limit)
      .toArray();
    return docs.map(this.toDomain);
  }

  public static async incrementCounters(
    id: string,
    inc: Partial<Record<'follower_count' | 'followed_count' | 'publication_count', number>>
  ): Promise<void> {
    const col = this.getCollection();
    await col.updateOne(MongoIdHelper.idFilter(id), { $inc: inc });
  }
}
