import { Publication } from '@oomfy/shared';

export function collectPublications(
  items: Array<Publication | null | undefined>,
  out: Map<string, Publication> = new Map(),
  isNested = false
): Map<string, Publication> {
  for (const item of items) {
    if (!item?.id) continue;
    if (item.target_publication) collectPublications([item.target_publication], out, true);
    const key = item.id.toLowerCase();
    const existing = out.get(key);
    if (!existing) out.set(key, item);
    else if (!isNested) out.set(key, { ...existing, ...item });
    else {
      out.set(key, {
        ...item, ...existing,
        upvotes_count: Math.max(existing.upvotes_count || 0, item.upvotes_count || 0),
        comments_count: Math.max(existing.comments_count || 0, item.comments_count || 0),
        shares_count: Math.max(existing.shares_count || 0, item.shares_count || 0),
        quotes_count: Math.max(existing.quotes_count || 0, item.quotes_count || 0),
        is_upvoted: existing.is_upvoted ?? item.is_upvoted,
      });
    }
  }
  return out;
}

export function mergePublicationEntity(
  prev: Publication | undefined,
  incoming: Publication,
  keepLocalInteractions: boolean
): Publication {
  if (!prev) return incoming;
  if (keepLocalInteractions) {
    return {
      ...prev, ...incoming,
      is_upvoted: prev.is_upvoted, upvotes_count: Math.max(0, prev.upvotes_count || 0),
      is_shared: prev.is_shared, shares_count: Math.max(0, prev.shares_count || 0),
      is_quoted: prev.is_quoted, quotes_count: Math.max(0, prev.quotes_count || 0),
      comments_count: Math.max(0, prev.comments_count || 0),
    };
  }
  const isUpvoted = incoming.is_upvoted ?? prev.is_upvoted;
  const rawUpvotes = incoming.upvotes_count !== undefined ? incoming.upvotes_count : (prev.upvotes_count || 0);
  const shares = Math.max(0, incoming.shares_count !== undefined ? incoming.shares_count : (prev.shares_count || 0));
  const quotes = Math.max(0, incoming.quotes_count !== undefined ? incoming.quotes_count : (prev.quotes_count || 0));
  const comments = Math.max(0, incoming.comments_count !== undefined ? incoming.comments_count : (prev.comments_count || 0));

  return {
    ...prev, ...incoming,
    is_upvoted: isUpvoted,
    upvotes_count: Math.max(0, rawUpvotes, isUpvoted ? 1 : 0),
    is_shared: incoming.is_shared ?? prev.is_shared,
    shares_count: shares,
    is_quoted: incoming.is_quoted ?? prev.is_quoted,
    quotes_count: quotes,
    comments_count: comments,
  };
}
