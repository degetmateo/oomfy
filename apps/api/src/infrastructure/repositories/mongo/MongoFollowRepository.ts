import { FollowRelation } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoFollowRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('follows');
  }

  private static idVariants(id: string): any[] {
    const list: any[] = [String(id)];
    const mongoId = MongoIdHelper.toMongoId(String(id));
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

  public static async filterFollowing(viewerId: string, candidateIds: string[]): Promise<Set<string>> {
    if (!viewerId || candidateIds.length === 0) return new Set();
    const col = this.getCollection();
    const viewerVariants = this.idVariants(viewerId);
    const candidateVariants = candidateIds.flatMap((id) => this.idVariants(id));

    const docs = await col
      .find({
        $or: [
          { follower_id: { $in: viewerVariants } },
          { 'follower.id': { $in: viewerVariants } },
        ],
        $and: [
          {
            $or: [
              { followed_id: { $in: candidateVariants } },
              { 'followed.id': { $in: candidateVariants } },
            ],
          },
        ],
      })
      .project({ followed_id: 1, 'followed.id': 1 })
      .toArray();

    const set = new Set<string>();
    for (const d of docs) {
      if (d.followed_id) set.add(String(d.followed_id));
      if (d.followed?.id) set.add(String(d.followed.id));
    }
    return set;
  }

  public static async getFollowers(
    targetId: string,
    followedUsername: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string
  ): Promise<FollowRelation[]> {
    const col = this.getCollection();
    const targetVariants = this.idVariants(targetId);
    const query: any = {
      $or: [
        { followed_id: { $in: targetVariants } },
        { 'followed.id': { $in: targetVariants } },
        { 'followed.username': { $regex: new RegExp(`^${followedUsername}$`, 'i') } },
      ],
    };

    if (olderId && offset === 0) {
      const olderVariants = this.idVariants(olderId);
      const olderDoc = await col.findOne({
        $and: [
          query,
          {
            $or: [
              { follower_id: { $in: olderVariants } },
              { 'follower.id': { $in: olderVariants } },
              { _id: { $in: olderVariants } },
            ],
          },
        ],
      });

      if (olderDoc?.created_at) {
        const olderDate = new Date(olderDoc.created_at);
        const olderIso = !isNaN(olderDate.getTime()) ? olderDate.toISOString() : null;
        const timeFilters: any[] = [{ created_at: { $lt: olderDoc.created_at } }];
        if (olderIso) {
          timeFilters.push({ created_at: { $lt: olderDate } });
          timeFilters.push({ created_at: { $lt: olderIso } });
        }
        query.$and = [{ $or: timeFilters }];
      }
    }

    return col
      .find(query)
      .sort({ created_at: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  public static async getFollowed(
    targetId: string,
    followerUsername: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string
  ): Promise<FollowRelation[]> {
    const col = this.getCollection();
    const targetVariants = this.idVariants(targetId);
    const query: any = {
      $or: [
        { follower_id: { $in: targetVariants } },
        { 'follower.id': { $in: targetVariants } },
        { 'follower.username': { $regex: new RegExp(`^${followerUsername}$`, 'i') } },
      ],
    };

    if (olderId && offset === 0) {
      const olderVariants = this.idVariants(olderId);
      const olderDoc = await col.findOne({
        $and: [
          query,
          {
            $or: [
              { followed_id: { $in: olderVariants } },
              { 'followed.id': { $in: olderVariants } },
              { _id: { $in: olderVariants } },
            ],
          },
        ],
      });

      if (olderDoc?.created_at) {
        const olderDate = new Date(olderDoc.created_at);
        const olderIso = !isNaN(olderDate.getTime()) ? olderDate.toISOString() : null;
        const timeFilters: any[] = [{ created_at: { $lt: olderDoc.created_at } }];
        if (olderIso) {
          timeFilters.push({ created_at: { $lt: olderDate } });
          timeFilters.push({ created_at: { $lt: olderIso } });
        }
        query.$and = [{ $or: timeFilters }];
      }
    }

    return col
      .find(query)
      .sort({ created_at: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }
}
