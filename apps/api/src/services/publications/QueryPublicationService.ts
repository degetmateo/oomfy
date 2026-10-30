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
      since: input.since,
      until: input.until,
      hasMedia: input.has_media,
      limit: input.limit,
      userId,
    };
    return MongoPublicationRepository.findFeed(params);
  }

  public static async getById(
    id: string,
    userId?: string
  ): Promise<{
    publication: Publication;
    ancestors: Publication[];
    replies: Publication[];
    thread: Publication[];
  }> {
    const publication = await MongoPublicationRepository.findById(id, userId);
    if (!publication) {
      throw new NotFoundError('Publicación no encontrada.');
    }

    const ancestors = await MongoPublicationRepository.findAncestors(publication, userId);
    const replies = await MongoPublicationRepository.findReplies(publication.id, userId);

    return {
      publication,
      ancestors,
      replies,
      thread: replies,
    };
  }
}
