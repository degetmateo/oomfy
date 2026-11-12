import { QueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';

export const PUBLICATION_LIST_KEYS = ['feed', 'user-posts', 'explore-posts', 'topic-hub'] as const;

function mapPub(pub: Publication | null | undefined, id: string, updater: (p: Publication) => Publication): Publication | null | undefined {
  if (!pub) return pub;
  let next = pub.id === id ? updater(pub) : pub;
  if (next.target_publication) {
    const mappedTarget = mapPub(next.target_publication, id, updater);
    if (mappedTarget !== next.target_publication) next = { ...next, target_publication: mappedTarget };
  }
  return next;
}

export class PublicationCacheService {
  public static findInCache(queryClient: QueryClient, id?: string): Publication | undefined {
    if (!id) return undefined;
    const fromMap = publicationIdentityMap.get(id);
    if (fromMap) return fromMap;

    const detail = queryClient.getQueryData<{ publication?: Publication }>(['publication', id]);
    if (detail?.publication) return detail.publication;

    for (const prefix of PUBLICATION_LIST_KEYS) {
      for (const q of queryClient.getQueryCache().findAll({ queryKey: [prefix] })) {
        const data = q.state.data as { pages?: { data: Publication[] }[]; data?: Publication[] } | undefined;
        const found = data?.pages
          ? data.pages.flatMap((p) => p.data || []).find((p) => p.id === id)
          : data?.data?.find((p) => p.id === id);
        if (found) return found;
      }
    }
    return undefined;
  }

  public static getPlaceholderDetailData(queryClient: QueryClient, id?: string) {
    const post = this.findInCache(queryClient, id);
    if (!post) return undefined;
    const resolved = publicationIdentityMap.get(post.id) || post;
    const target = resolved.target_publication?.id
      ? (publicationIdentityMap.get(resolved.target_publication.id) || resolved.target_publication)
      : null;
    return {
      publication: target ? { ...resolved, target_publication: target } : resolved,
      ancestors: target ? [target] : [],
      total_ancestors: target ? 1 : 0,
      has_more_ancestors: false,
      replies: [],
    };
  }

  public static applyPatch(queryClient: QueryClient, id: string, updater: (p: Publication) => Publication, fallback?: Publication): void {
    if (!publicationIdentityMap.get(id) && fallback) publicationIdentityMap.seed([fallback]);
    publicationIdentityMap.patch(id, updater);

    for (const prefix of PUBLICATION_LIST_KEYS) {
      queryClient.setQueriesData({ queryKey: [prefix] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old.pages)) {
          return { ...old, pages: old.pages.map((page: any) => ({ ...page, data: Array.isArray(page.data) ? page.data.map((p: Publication) => mapPub(p, id, updater)) : page.data })) };
        }
        if (Array.isArray(old.data)) return { ...old, data: old.data.map((p: Publication) => mapPub(p, id, updater)) };
        return old;
      });
    }

    queryClient.setQueriesData({ queryKey: ['publication'] }, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        publication: mapPub(old.publication, id, updater),
        ancestors: Array.isArray(old.ancestors) ? old.ancestors.map((p: Publication) => mapPub(p, id, updater)) : old.ancestors,
        replies: Array.isArray(old.replies) ? old.replies.map((p: Publication) => mapPub(p, id, updater)) : old.replies,
        thread: Array.isArray(old.thread) ? old.thread.map((p: Publication) => mapPub(p, id, updater)) : old.thread,
      };
    });
  }

  public static invalidatePublicationLists(queryClient: QueryClient): void {
    PUBLICATION_LIST_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  public static primePublication(post: Publication): void {
    if (!post?.id) return;
    publicationIdentityMap.seed([post]);
  }
}
