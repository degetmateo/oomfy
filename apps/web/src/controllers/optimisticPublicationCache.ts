import { QueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { revokeTrackedBlobs } from './optimisticPublicationFactory.js';

function patchListQueries(
  queryClient: QueryClient,
  pub: Publication,
  mode: 'prepend' | 'replace' | 'remove',
  replaceId?: string
): void {
  const updatePages = (old: any) => {
    if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
    if (mode === 'prepend') {
      const first = old.pages[0];
      return { ...old, pages: [{ ...first, data: [pub, ...(first.data || [])] }, ...old.pages.slice(1)] };
    }
    return {
      ...old,
      pages: old.pages.map((pg: any) => ({
        ...pg,
        data:
          mode === 'replace'
            ? (pg.data || []).map((p: Publication) => (p.id === replaceId ? pub : p))
            : (pg.data || []).filter((p: Publication) => p.id !== (replaceId || pub.id)),
      })),
    };
  };

  for (const q of queryClient.getQueryCache().findAll({ queryKey: ['feed'] })) {
    if (mode === 'prepend' && q.queryKey[1] === 'following') continue;
    queryClient.setQueryData(q.queryKey, updatePages);
  }
  queryClient.setQueriesData({ queryKey: ['user-posts'] }, (old: any) => updatePages(old));
  if (pub.parent_publication_id) {
    queryClient.setQueryData(['publication', pub.parent_publication_id], (old: any) => {
      if (!old) return old;
      const mapList = (list: Publication[] | undefined) =>
        !Array.isArray(list) ? list
          : mode === 'prepend' ? [pub, ...list]
          : mode === 'replace' ? list.map((p) => (p.id === replaceId ? pub : p))
          : list.filter((p) => p.id !== (replaceId || pub.id));
      return { ...old, replies: mapList(old.replies), thread: mapList(old.thread) };
    });
  }
}

export function insertOptimisticPublication(queryClient: QueryClient, pub: Publication): void {
  publicationIdentityMap.ingest([pub], Date.now());
  if (pub.type !== 'reply') {
    patchListQueries(queryClient, pub, 'prepend');
    userIdentityMap.patch(pub.author.username, (u) => ({ ...u, publication_count: (u.publication_count || 0) + 1 }));
    if (pub.type === 'quote' && pub.parent_publication_id) {
      PublicationCacheService.applyPatch(queryClient, pub.parent_publication_id, (p) => ({
        ...p, is_quoted: true, quotes_count: (p.quotes_count || 0) + 1,
      }), pub.target_publication || undefined);
    }
  } else if (pub.parent_publication_id) {
    patchListQueries(queryClient, pub, 'prepend');
    PublicationCacheService.applyPatch(queryClient, pub.parent_publication_id, (p) => ({
      ...p, comments_count: (p.comments_count || 0) + 1,
    }), pub.target_publication || undefined);
  }
}

export function commitOptimisticPublication(queryClient: QueryClient, tempId: string, realPub: Publication): void {
  revokeTrackedBlobs(tempId);
  publicationIdentityMap.remove(tempId);
  publicationIdentityMap.ingest([realPub], Date.now());
  patchListQueries(queryClient, realPub, 'replace', tempId);
}

export function rollbackOptimisticPublication(queryClient: QueryClient, pub: Publication): void {
  revokeTrackedBlobs(pub.id);
  publicationIdentityMap.remove(pub.id);
  patchListQueries(queryClient, pub, 'remove', pub.id);
  if (pub.type !== 'reply') {
    userIdentityMap.patch(pub.author.username, (u) => ({ ...u, publication_count: Math.max(0, (u.publication_count || 1) - 1) }));
    if (pub.type === 'quote' && pub.parent_publication_id) {
      PublicationCacheService.applyPatch(queryClient, pub.parent_publication_id, (p) => ({
        ...p, is_quoted: false, quotes_count: Math.max(0, (p.quotes_count || 1) - 1),
      }));
    }
  } else if (pub.parent_publication_id) {
    PublicationCacheService.applyPatch(queryClient, pub.parent_publication_id, (p) => ({
      ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1),
    }));
  }
}
