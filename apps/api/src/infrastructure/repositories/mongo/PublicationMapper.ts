import { Publication, MediaItem } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';

export class PublicationMapper {
  public static toDomain(doc: any): Publication {
    const rawId = doc._id ? doc._id.toString() : doc.id;
    const authorRawId = doc.author?._id ? doc.author._id.toString() : (doc.author?.id ? doc.author.id.toString() : '');

    const authorUsername = doc.author?.username || 'anonymous';
    const dynamicIcon = authorUsername !== 'anonymous' ? `/members/${authorUsername}/icon` : null;
    const dynamicBanner = authorUsername !== 'anonymous' ? `/members/${authorUsername}/banner` : null;

    const parentId = doc.parent_publication_id
      ? doc.parent_publication_id.toString()
      : (doc.target_publication_id ? doc.target_publication_id.toString() : null);

    const rootId = doc.root_publication_id
      ? doc.root_publication_id.toString()
      : null;

    return {
      id: rawId,
      author: {
        id: authorRawId || '',
        username: authorUsername,
        name: doc.author?.name || doc.author?.username || 'Anonymous',
        role: doc.author?.role || 'member',
        icon_url: dynamicIcon || doc.author?.icon_url || doc.author?.icon?.url || null,
        banner_url: dynamicBanner || doc.author?.banner_url || doc.author?.banner?.url || null,
      },
      type: doc.type || 'default',
      content: doc.content || null,
      created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
      parent_publication_id: parentId,
      root_publication_id: rootId,
      thread_ids: (doc.thread_ids || []).map((t: any) => t.toString()),
      images: PublicationMapper.sanitizeImages(doc.images),
      embeds: doc.embeds || [],
      upvotes_count: Math.max(0, doc.upvote_count || 0, doc.upvotes_count || 0),
      shares_count: Math.max(0, doc.share_count || 0, doc.shares_count || 0),
      quotes_count: Math.max(0, doc.quote_count || 0, doc.quotes_count || 0),
      comments_count: Math.max(0, doc.comment_count || 0, doc.comments_count || 0),
      is_upvoted: Boolean(doc.is_upvoted),
      is_shared: Boolean(doc.is_shared),
      target_publication: doc.target_publication ? PublicationMapper.toDomain(doc.target_publication) : null,
    };
  }

  public static sanitizeImages(images?: any[]): MediaItem[] {
    return (images || [])
      .filter((img: any) => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .map((img: any, idx: number) => ({
        url: img.url,
        source: img.source || 'other',
        index: typeof img.index === 'number' ? img.index : idx,
      }));
  }

  public static toPersistence(publication: Publication): Record<string, any> {
    const pubMongoId = MongoIdHelper.toMongoId(publication.id);
    const parentMongoId = publication.parent_publication_id ? MongoIdHelper.toMongoId(publication.parent_publication_id) : null;
    const rootMongoId = publication.root_publication_id ? MongoIdHelper.toMongoId(publication.root_publication_id) : null;
    const authorMongoId = publication.author?.id ? MongoIdHelper.toMongoId(publication.author.id) : null;
    return {
      ...publication,
      _id: pubMongoId,
      id: pubMongoId,
      parent_publication_id: parentMongoId,
      target_publication_id: parentMongoId,
      root_publication_id: rootMongoId,
      thread_ids: publication.thread_ids?.map((t) => MongoIdHelper.toMongoId(t)) || [],
      author: { ...publication.author, _id: authorMongoId, id: authorMongoId },
      created_at: publication.created_at ? new Date(publication.created_at) : new Date(),
      upvote_count: Math.max(0, publication.upvotes_count || 0),
      share_count: Math.max(0, publication.shares_count || 0),
      comment_count: Math.max(0, publication.comments_count || 0),
      quote_count: Math.max(0, publication.quotes_count || 0),
    };
  }
}
