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

    const setFields: Record<string, any> = {
      _id: mongoId,
      id: user.id,
      username: user.username,
    };
    if (user.name !== undefined) setFields.name = user.name;
    if (user.role !== undefined) setFields.role = user.role;
    if (user.bio !== undefined) setFields.bio = user.bio;
    if (user.location !== undefined) setFields.location = user.location;
    if (user.link !== undefined) setFields.link = user.link;
    if (user.icon_url !== undefined) {
      setFields.icon_url = user.icon_url;
      setFields.icon = user.icon_url ? { url: user.icon_url } : null;
    }
    if (user.banner_url !== undefined) {
      setFields.banner_url = user.banner_url;
      setFields.banner = user.banner_url ? { url: user.banner_url } : null;
    }
    if (user.created_at !== undefined) setFields.created_at = user.created_at;

    const onInsertFields: Record<string, any> = {
      follower_count: 0,
      followed_count: 0,
      publication_count: 0,
    };
    if (setFields.name === undefined) {
      onInsertFields.name = user.name || user.username;
    }
    if (setFields.role === undefined) {
      onInsertFields.role = user.role || 'member';
    }
    if (setFields.created_at === undefined) {
      onInsertFields.created_at = new Date().toISOString();
    }

    await col.updateOne(
      MongoIdHelper.idFilter(user.id),
      {
        $set: setFields,
        $setOnInsert: onInsertFields,
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

  public static async findManyByIds(ids: string[]): Promise<PublicUser[]> {
    if (ids.length === 0) return [];
    const col = this.getCollection();
    const allFilters = ids.flatMap((id) => MongoIdHelper.idFilter(id).$or);
    const docs = await col.find({ $or: allFilters }).toArray();
    return docs.map(this.toDomain);
  }

  public static async getRawMediaUrls(username: string): Promise<{ icon_url: string | null; banner_url: string | null }> {
    const col = this.getCollection();
    const doc = await col.findOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { projection: { icon_url: 1, 'icon.url': 1, banner_url: 1, 'banner.url': 1 } }
    );
    return {
      icon_url: doc?.icon_url || doc?.icon?.url || null,
      banner_url: doc?.banner_url || doc?.banner?.url || null,
    };
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
