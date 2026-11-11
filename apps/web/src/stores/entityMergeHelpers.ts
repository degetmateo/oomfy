import { Publication } from '@oomfy/shared';

export function collectPublications(
  items: Array<Publication | null | undefined>,
  out: Map<string, Publication> = new Map()
): Map<string, Publication> {
  for (const item of items) {
    if (!item?.id) continue;
    if (item.target_publication) collectPublications([item.target_publication], out);
    out.set(item.id, item);
  }
  return out;
}

export function mergePublicationEntity(
  prev: Publication | undefined,
  incoming: Publication,
  keepLocalInteractions: boolean
): Publication {
  if (!prev) return incoming;
  if (!keepLocalInteractions) return { ...prev, ...incoming };
  return {
    ...prev,
    ...incoming,
    is_upvoted: prev.is_upvoted,
    upvotes_count: prev.upvotes_count,
    is_shared: prev.is_shared,
    shares_count: prev.shares_count,
    is_quoted: prev.is_quoted,
    quotes_count: prev.quotes_count,
    comments_count: prev.comments_count,
  };
}

