import { QueryPublicationInput, Publication } from '@oomfy/shared';
import { MongoPublicationRepository, FeedParams } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { NotFoundError } from '../../errors/AppError.js';

export class QueryPublicationService {
  public static async getFeed(input: QueryPublicationInput & { query?: string; since?: string; until?: string; has_media?: boolean; liked_by?: string }, userId?: string): Promise<Publication[]> {
    const params: FeedParams = {
      olderId: input.older_id,
      authorUsername: input.author_username,
      type: input.type,
      likedBy: input.liked_by,
      query: input.query,
      feed: input.feed,
      since: input.since,
      until: input.until,
      hasMedia: input.has_media,
      limit: input.limit,
      userId,
    };
    return MongoPublicationRepository.findFeed(params);
  }

  public static async getById(id: string, userId?: string, ancestorsLimit: number = 4): Promise<{
    publication: Publication; ancestors: Publication[]; total_ancestors: number;
    has_more_ancestors: boolean; replies: Publication[]; thread: Publication[];
  }> {
    const publication = await MongoPublicationRepository.findById(id, userId);
    if (!publication) throw new NotFoundError('Publicación no encontrada.');

    const allAncestors = await MongoPublicationRepository.findAncestors(publication, userId);
    const replies = await MongoPublicationRepository.findReplies(publication.id, userId, 50, publication);

    const totalAncestors = allAncestors.length;
    const hasMoreAncestors = totalAncestors > ancestorsLimit;
    const initialAncestors = hasMoreAncestors ? allAncestors.slice(-ancestorsLimit) : allAncestors;
    const commentsCount = Math.max(publication.comments_count || 0, replies.length);
    const upvotesCount = Math.max(publication.upvotes_count || 0, publication.is_upvoted ? 1 : 0);

    return {
      publication: { ...publication, comments_count: commentsCount, upvotes_count: upvotesCount },
      ancestors: initialAncestors, total_ancestors: totalAncestors, has_more_ancestors: hasMoreAncestors,
      replies, thread: replies,
    };
  }

  public static async getAncestors(id: string, userId?: string, beforeId?: string, limit: number = 4) {
    const publication = await MongoPublicationRepository.findById(id, userId);
    if (!publication) throw new NotFoundError('Publicación no encontrada.');

    const allAncestors = await MongoPublicationRepository.findAncestors(publication, userId);
    if (!beforeId) {
      const slice = allAncestors.slice(-limit);
      const remaining = Math.max(0, allAncestors.length - limit);
      return { ancestors: slice, has_more: remaining > 0, remaining };
    }
    const targetIdx = allAncestors.findIndex((a) => a.id === beforeId);
    if (targetIdx <= 0) return { ancestors: [], has_more: false, remaining: 0 };
    const startIdx = Math.max(0, targetIdx - limit);
    return { ancestors: allAncestors.slice(startIdx, targetIdx), has_more: startIdx > 0, remaining: startIdx };
  }

  public static async getSubthread(id: string, userId?: string, mode: 'author' | 'subthread' = 'subthread', offset = 0, limit = 5) {
    const publication = await MongoPublicationRepository.findById(id, userId);
    if (!publication) throw new NotFoundError('Publicación no encontrada.');
    return MongoPublicationRepository.findSubthread(publication, mode, offset, limit, userId);
  }
}
