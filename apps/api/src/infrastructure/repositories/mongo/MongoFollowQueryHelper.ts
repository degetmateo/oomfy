import { Collection } from 'mongodb';
import { FollowRelation } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';

export class MongoFollowQueryHelper {
  public static async queryEdges(
    col: Collection<any>,
    targetField: 'followed' | 'follower',
    cursorField: 'follower' | 'followed',
    targetId: string,
    username: string,
    limit: number,
    offset: number,
    olderId?: string
  ): Promise<FollowRelation[]> {
    const targetVariants = MongoIdHelper.idVariants(targetId);
    const safeUsername = MongoIdHelper.escapeRegex(username);
    const query: any = {
      $or: [
        { [`${targetField}_id`]: { $in: targetVariants } },
        { [`${targetField}.id`]: { $in: targetVariants } },
        { [`${targetField}.username`]: { $regex: new RegExp(`^${safeUsername}$`, 'i') } },
      ],
    };

    if (olderId && offset === 0) {
      const olderVariants = MongoIdHelper.idVariants(olderId);
      const olderDoc = await col.findOne({
        $and: [
          query,
          {
            $or: [
              { [`${cursorField}_id`]: { $in: olderVariants } },
              { [`${cursorField}.id`]: { $in: olderVariants } },
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

    return col.find(query).sort({ created_at: -1, _id: -1 }).skip(offset).limit(limit).toArray();
  }

  public static async filterFollowing(
    col: Collection<any>,
    viewerId: string,
    candidateIds: string[]
  ): Promise<Set<string>> {
    if (!viewerId || candidateIds.length === 0) return new Set();
    const viewerVariants = MongoIdHelper.idVariants(viewerId);
    const candidateVariants = candidateIds.flatMap((id) => MongoIdHelper.idVariants(id));
    const docs = await col
      .find({
        $or: [{ follower_id: { $in: viewerVariants } }, { 'follower.id': { $in: viewerVariants } }],
        $and: [{ $or: [{ followed_id: { $in: candidateVariants } }, { 'followed.id': { $in: candidateVariants } }] }],
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
}

