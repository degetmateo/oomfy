import { Publication } from '@oomfy/shared';

export class PublicationMapper {
  public static toDomain(doc: any): Publication {
    const rawId = doc._id ? doc._id.toString() : doc.id;
    const authorRawId = doc.author?._id ? doc.author._id.toString() : doc.author?.id;

    const authorUsername = doc.author?.username || 'anonymous';
    const dynamicIcon = authorUsername !== 'anonymous' ? `/api/members/${authorUsername}/icon` : null;
    const dynamicBanner = authorUsername !== 'anonymous' ? `/api/members/${authorUsername}/banner` : null;

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
      parent_publication_id: doc.parent_publication_id || doc.target_publication_id?.toString() || null,
      root_publication_id: doc.root_publication_id ? doc.root_publication_id.toString() : null,
      thread_ids: doc.thread_ids?.map((t: any) => t.toString()) || [],
      images: (doc.images || []).filter((img: any) => img && typeof img.url === 'string' && img.url.trim().length > 0),
      embeds: doc.embeds || [],
      upvotes_count: doc.upvote_count ?? doc.upvotes_count ?? 0,
      shares_count: doc.share_count ?? doc.shares_count ?? 0,
      quotes_count: doc.quote_count ?? doc.quotes_count ?? 0,
      comments_count: doc.comment_count ?? doc.comments_count ?? 0,
      is_upvoted: Boolean(doc.is_upvoted),
      is_shared: Boolean(doc.is_shared),
      target_publication: doc.target_publication ? PublicationMapper.toDomain(doc.target_publication) : null,
    };
  }
}

