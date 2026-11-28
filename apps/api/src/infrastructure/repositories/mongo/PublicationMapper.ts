import { Publication, MediaItem } from '@oomfy/shared';
import { MongoIdHelper } from './MongoIdHelper.js';
import { isHttpUrl, toSafeHttpsAssetUrl } from '../../../utils/UrlSecurityHelper.js';

function normalizeAssetUrl(raw?: string | null): string | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return toSafeHttpsAssetUrl(trimmed);
}

function sanitizeIframeUrl(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:') return undefined;
    const host = u.hostname.toLowerCase();
    if (host === 'open.spotify.com' && u.pathname.startsWith('/embed/')) return u.toString();
    if (host === 'www.youtube-nocookie.com' && /^\/embed\/[a-zA-Z0-9_-]{11}$/.test(u.pathname)) return u.toString();
    return undefined;
  } catch { return undefined; }
}

export class PublicationMapper {
  public static stripViewerFlags(pub: Publication): Publication {
    const clean: Record<string, any> = { ...pub };
    delete clean.is_upvoted;
    delete clean.is_shared;
    delete clean.is_quoted;
    delete clean.is_bookmarked;
    if (clean.target_publication && typeof clean.target_publication === 'object') {
      clean.target_publication = PublicationMapper.stripViewerFlags(clean.target_publication);
    }
    return clean as Publication;
  }

  public static toDomain(doc: any): Publication {
    const rawId = doc._id ? doc._id.toString() : doc.id;
    const authorRawId = doc.author?._id ? doc.author._id.toString() : (doc.author?.id ? doc.author.id.toString() : '');
    const authorUsername = doc.author?.username || 'anonymous';
    const dynamicIcon = authorUsername !== 'anonymous' ? `/members/${authorUsername}/icon` : null;
    const storedIcon = normalizeAssetUrl(doc.author?.icon_url !== undefined ? doc.author.icon_url : doc.author?.icon?.url);
    const storedBanner = normalizeAssetUrl(doc.author?.banner_url !== undefined ? doc.author.banner_url : doc.author?.banner?.url);
    const hasExplicitNullIcon = doc.author && (doc.author.icon_url === null || doc.author.icon === null);
    const parentId = doc.parent_publication_id
      ? doc.parent_publication_id.toString()
      : (doc.target_publication_id ? doc.target_publication_id.toString() : null);
    const rootId = doc.root_publication_id ? doc.root_publication_id.toString() : null;

    return {
      id: rawId,
      author: {
        id: authorRawId || '', username: authorUsername, name: doc.author?.name || doc.author?.username || 'Anonymous',
        role: doc.author?.role || 'member', icon_url: storedIcon || (hasExplicitNullIcon ? null : dynamicIcon), banner_url: storedBanner || null,
      },
      type: doc.type || 'default', content: doc.content || null,
      created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
      parent_publication_id: parentId, root_publication_id: rootId,
      thread_ids: (doc.thread_ids || []).map((t: any) => t.toString()),
      images: PublicationMapper.sanitizeImages(doc.images),
      embeds: PublicationMapper.sanitizeEmbeds(doc.embeds),
      upvotes_count: Math.max(0, doc.upvote_count || 0, doc.upvotes_count || 0),
      shares_count: Math.max(0, doc.share_count || 0, doc.shares_count || 0),
      quotes_count: Math.max(0, doc.quote_count || 0, doc.quotes_count || 0),
      comments_count: Math.max(0, doc.comment_count || 0, doc.comments_count || 0),
      target_publication: doc.target_publication ? PublicationMapper.toDomain(doc.target_publication) : null,
    };
  }

  public static sanitizeEmbeds(rawEmbeds?: any[]): any[] {
    return (rawEmbeds || [])
      .filter((emb) => emb && typeof emb.url === 'string' && isHttpUrl(emb.url))
      .map((emb) => ({
        ...emb,
        ...(emb.thumbnail_url ? { thumbnail_url: normalizeAssetUrl(emb.thumbnail_url) || undefined } : {}),
        ...(emb.image ? { image: normalizeAssetUrl(emb.image) } : {}),
        ...(emb.avatar_url ? { avatar_url: normalizeAssetUrl(emb.avatar_url) } : {}),
        ...(emb.iframe_url ? { iframe_url: sanitizeIframeUrl(emb.iframe_url) } : {}),
      }));
  }

  public static sanitizeImages(images?: any[]): MediaItem[] {
    return (images || [])
      .map((img: any) => ({ ...img, url: normalizeAssetUrl(img?.url) }))
      .filter((img: any) => Boolean(img.url))
      .map((img: any, idx: number) => ({
        url: img.url,
        source: img.source || 'other',
        index: typeof img.index === 'number' ? img.index : idx,
        ...(img.warning === 'spoiler' || img.warning === 'sensitive' ? { warning: img.warning } : {}),
        ...(img.is_gif === true || img.source === 'tenor' ? { is_gif: true } : {}),
      }));
  }

  public static toPersistence(publication: Publication): Record<string, any> {
    const clean = PublicationMapper.stripViewerFlags(publication);
    const pubMongoId = MongoIdHelper.toMongoId(publication.id);
    const parentMongoId = publication.parent_publication_id ? MongoIdHelper.toMongoId(publication.parent_publication_id) : null;
    const rootMongoId = publication.root_publication_id ? MongoIdHelper.toMongoId(publication.root_publication_id) : null;
    const authorMongoId = publication.author?.id ? MongoIdHelper.toMongoId(publication.author.id) : null;
    return {
      ...clean, _id: pubMongoId, id: pubMongoId,
      parent_publication_id: parentMongoId, target_publication_id: parentMongoId, root_publication_id: rootMongoId,
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
