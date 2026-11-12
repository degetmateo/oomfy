import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class PublicationInteractionDecorator {
  public static async decorate(posts: Publication[], userId?: string): Promise<Publication[]> {
    if (!userId || posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);
    const targetIds = posts.map((p) => p.target_publication?.id).filter(Boolean) as string[];
    const allPostVariants = [...postIds, ...targetIds].flatMap((id) => MongoIdHelper.idVariants(id));
    const userVariants = MongoIdHelper.idVariants(userId);
    const db = MongoDatabase.getDb();

    const [userUpvotes, userShares, userQuotes] = await Promise.all([
      db.collection('upvotes').find({
        user_id: { $in: userVariants },
        publication_id: { $in: allPostVariants },
      }).toArray(),
      db.collection('publications').find({
        type: 'shared',
        $or: [{ 'author.id': { $in: userVariants } }, { 'author._id': { $in: userVariants } }],
        $and: [{
          $or: [
            { parent_publication_id: { $in: allPostVariants } },
            { target_publication_id: { $in: allPostVariants } },
          ],
        }],
      }).toArray(),
      db.collection('publications').find({
        type: 'quote',
        $or: [{ 'author.id': { $in: userVariants } }, { 'author._id': { $in: userVariants } }],
        $and: [{
          $or: [
            { parent_publication_id: { $in: allPostVariants } },
            { target_publication_id: { $in: allPostVariants } },
          ],
        }],
      }).toArray(),
    ]);

    const upvotedSet = new Set(
      userUpvotes.map((u: any) => (u.publication_id?.toString() || u.publication_id || '').toLowerCase())
    );
    const sharedSet = new Set(
      userShares.map((s: any) =>
        (s.parent_publication_id?.toString() || s.target_publication_id?.toString() || '').toLowerCase()
      )
    );
    const quotedSet = new Set(
      userQuotes.map((q: any) =>
        (q.parent_publication_id?.toString() || q.target_publication_id?.toString() || '').toLowerCase()
      )
    );

    for (const post of posts) {
      const pid = (post.id || '').toLowerCase();
      post.is_upvoted = upvotedSet.has(pid);
      post.is_shared = sharedSet.has(pid);
      post.is_quoted = quotedSet.has(pid);
      if (post.target_publication) {
        const tid = (post.target_publication.id || '').toLowerCase();
        post.target_publication.is_upvoted = upvotedSet.has(tid);
        post.target_publication.is_shared = sharedSet.has(tid);
        post.target_publication.is_quoted = quotedSet.has(tid);
      }
    }

    return posts;
  }
}
