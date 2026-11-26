import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export class PublicationInteractionDecorator {
  public static async decorate(posts: Publication[], userId?: string): Promise<Publication[]> {
    if (!userId || posts.length === 0) return posts;

    const nestedPreviewIds = posts
      .flatMap((p) => [...(p.author_thread_preview || []), ...(p.subthread_preview || [])])
      .map((p) => p?.id)
      .filter(Boolean) as string[];
    const postIds = posts.map((p) => p.id);
    const targetIds = posts.map((p) => p.target_publication?.id).filter(Boolean) as string[];
    const allPostVariants = Array.from(new Set([...postIds, ...targetIds, ...nestedPreviewIds]))
      .flatMap((id) => MongoIdHelper.idVariants(id));
    const userVariants = MongoIdHelper.idVariants(userId);
    const db = MongoDatabase.getDb();

    const [userUpvotes, userShares, userQuotes, userBookmarks] = await Promise.all([
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
      db.collection('bookmarks').find({
        user_id: { $in: userVariants },
        publication_id: { $in: allPostVariants },
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
    const bookmarkedSet = new Set(
      userBookmarks.map((b: any) => (b.publication_id?.toString() || b.publication_id || '').toLowerCase())
    );

    for (const post of posts) {
      const pid = (post.id || '').toLowerCase();
      post.is_upvoted = upvotedSet.has(pid);
      post.is_shared = sharedSet.has(pid);
      post.is_quoted = quotedSet.has(pid);
      post.is_bookmarked = bookmarkedSet.has(pid);
      if (post.target_publication) {
        const tid = (post.target_publication.id || '').toLowerCase();
        post.target_publication.is_upvoted = upvotedSet.has(tid);
        post.target_publication.is_shared = sharedSet.has(tid);
        post.target_publication.is_quoted = quotedSet.has(tid);
        post.target_publication.is_bookmarked = bookmarkedSet.has(tid);
      }
      for (const preview of [...(post.author_thread_preview || []), ...(post.subthread_preview || [])]) {
        const sid = (preview.id || '').toLowerCase();
        preview.is_upvoted = upvotedSet.has(sid);
        preview.is_shared = sharedSet.has(sid);
        preview.is_quoted = quotedSet.has(sid);
        preview.is_bookmarked = bookmarkedSet.has(sid);
      }
    }

    return posts;
  }
}
