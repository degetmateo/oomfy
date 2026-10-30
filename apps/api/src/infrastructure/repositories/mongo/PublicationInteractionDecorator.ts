import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class PublicationInteractionDecorator {
  public static async decorate(posts: Publication[], userId?: string): Promise<Publication[]> {
    if (!userId || posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);
    const mongoIds = postIds.map((id) => MongoIdHelper.toMongoId(id));
    const db = MongoDatabase.getDb();

    const [userUpvotes, userShares] = await Promise.all([
      db.collection('upvotes').find({
        user_id: userId,
        publication_id: { $in: postIds },
      }).toArray(),
      db.collection('publications').find({
        type: 'shared',
        'author.id': userId,
        $or: [
          { parent_publication_id: { $in: postIds } },
          { target_publication_id: { $in: mongoIds } },
        ],
      }).toArray(),
    ]);

    const upvotedSet = new Set(userUpvotes.map((u: any) => u.publication_id));
    const sharedSet = new Set(
      userShares.map((s: any) => s.parent_publication_id || s.target_publication_id?.toString())
    );

    for (const post of posts) {
      post.is_upvoted = upvotedSet.has(post.id);
      post.is_shared = sharedSet.has(post.id);
    }

    return posts;
  }
}

