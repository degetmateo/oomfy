import { FollowRelation } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoFollowRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('follows');
  }

  private static idVariants(id: string): any[] {
    const list: any[] = [id];
    const mongoId = MongoIdHelper.toMongoId(id);
    if (mongoId && mongoId !== id) list.push(mongoId);
    return list;
  }

  public static async follow(relation: FollowRelation): Promise<void> {
    const col = this.getCollection();
    const followerVariants = this.idVariants(relation.follower_id);
    const followedVariants = this.idVariants(relation.followed_id);

    await col.updateOne(
      {
        follower_id: { $in: followerVariants },
        followed_id: { $in: followedVariants },
      },
      {
        $setOnInsert: {
          ...relation,
          follower_id: relation.follower_id,
          followed_id: relation.followed_id,
        },
      },
      { upsert: true }
    );
  }

  public static async unfollow(followerId: string, followedId: string): Promise<boolean> {
    const col = this.getCollection();
    const followerVariants = this.idVariants(followerId);
    const followedVariants = this.idVariants(followedId);
    const result = await col.deleteMany({
      follower_id: { $in: followerVariants },
      followed_id: { $in: followedVariants },
    });
    return (result.deletedCount ?? 0) > 0;
  }

  public static async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const col = this.getCollection();
    const followerVariants = this.idVariants(followerId);
    const followedVariants = this.idVariants(followedId);
    const count = await col.countDocuments({
      follower_id: { $in: followerVariants },
      followed_id: { $in: followedVariants },
    });
    return count > 0;
  }

  public static async getFollowedUserIds(followerId: string): Promise<string[]> {
    const col = this.getCollection();
    const followerVariants = this.idVariants(followerId);
    const follows = await col.find({ follower_id: { $in: followerVariants } }).toArray();
    const ids: string[] = [];
    for (const f of follows) {
      if (f.followed_id) ids.push(String(f.followed_id));
      if (f.followed?.id) ids.push(String(f.followed.id));
    }
    return Array.from(new Set(ids));
  }

  public static async getFollowers(followedUsername: string, limit: number = 20, olderId?: string): Promise<FollowRelation[]> {
    const col = this.getCollection();
    const query: any = { 'followed.username': { $regex: new RegExp(`^${followedUsername}$`, 'i') } };
    if (olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(olderId));
      if (olderDoc?.created_at) {
        query.created_at = { $lt: olderDoc.created_at };
      }
    }
    return col
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  public static async getFollowed(followerUsername: string, limit: number = 20, olderId?: string): Promise<FollowRelation[]> {
    const col = this.getCollection();
    const query: any = { 'follower.username': { $regex: new RegExp(`^${followerUsername}$`, 'i') } };
    if (olderId) {
      const olderDoc = await col.findOne(MongoIdHelper.idFilter(olderId));
      if (olderDoc?.created_at) {
        query.created_at = { $lt: olderDoc.created_at };
      }
    }
    return col
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }
}

