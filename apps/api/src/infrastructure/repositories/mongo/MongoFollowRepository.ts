import { v7 as uuidv7 } from 'uuid';
import { FollowRelation } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoFollowQueryHelper } from './MongoFollowQueryHelper.js';

export class MongoFollowRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('follows');
  }

  public static async follow(relation: FollowRelation): Promise<void> {
    const col = this.getCollection();
    const followerVariants = MongoIdHelper.idVariants(relation.follower_id);
    const followedVariants = MongoIdHelper.idVariants(relation.followed_id);
    const followerUuid = MongoIdHelper.toMongoId(relation.follower_id);
    const followedUuid = MongoIdHelper.toMongoId(relation.followed_id);
    const idVal = relation.id || uuidv7();

    await col.updateOne(
      { follower_id: { $in: followerVariants }, followed_id: { $in: followedVariants } },
      {
        $setOnInsert: {
          ...relation,
          _id: MongoIdHelper.toMongoId(idVal),
          id: idVal,
          follower_id: followerUuid,
          followed_id: followedUuid,
          follower: relation.follower ? { ...relation.follower, id: followerUuid } : relation.follower,
          followed: relation.followed ? { ...relation.followed, id: followedUuid } : relation.followed,
        },
      },
      { upsert: true }
    );
  }

  public static async unfollow(followerId: string, followedId: string): Promise<boolean> {
    const res = await this.getCollection().deleteMany({
      follower_id: { $in: MongoIdHelper.idVariants(followerId) },
      followed_id: { $in: MongoIdHelper.idVariants(followedId) },
    });
    return (res.deletedCount ?? 0) > 0;
  }

  public static async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const count = await this.getCollection().countDocuments({
      follower_id: { $in: MongoIdHelper.idVariants(followerId) },
      followed_id: { $in: MongoIdHelper.idVariants(followedId) },
    });
    return count > 0;
  }

  public static async getFollowedUserIds(followerId: string): Promise<string[]> {
    const follows = await this.getCollection().find({ follower_id: { $in: MongoIdHelper.idVariants(followerId) } }).toArray();
    const ids: string[] = [];
    for (const f of follows) {
      if (f.followed_id) ids.push(String(f.followed_id));
      if (f.followed?.id) ids.push(String(f.followed.id));
    }
    return Array.from(new Set(ids));
  }

  public static filterFollowing(viewerId: string, candidateIds: string[]): Promise<Set<string>> {
    return MongoFollowQueryHelper.filterFollowing(this.getCollection(), viewerId, candidateIds);
  }

  public static getFollowers(
    targetId: string,
    followedUsername: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string
  ): Promise<FollowRelation[]> {
    return MongoFollowQueryHelper.queryEdges(this.getCollection(), 'followed', 'follower', targetId, followedUsername, limit, offset, olderId);
  }

  public static getFollowed(
    targetId: string,
    followerUsername: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string
  ): Promise<FollowRelation[]> {
    return MongoFollowQueryHelper.queryEdges(this.getCollection(), 'follower', 'followed', targetId, followerUsername, limit, offset, olderId);
  }
}
