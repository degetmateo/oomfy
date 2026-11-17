import { useInfiniteQuery, QueryKey } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useInfiniteScroll } from './useInfiniteScroll.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

interface UseCursorFeedOptions {
  queryKey: QueryKey;
  buildUrl: (olderId: string | null) => string;
  limit?: number;
  enabled?: boolean;
}

export function useCursorFeed({ queryKey, buildUrl, limit = 20, enabled = true }: UseCursorFeedOptions) {
  const query = useInfiniteQuery<{ success: boolean; data: Publication[] }>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const fetchedAt = Date.now();
      const res = await ApiClient.get<{ success: boolean; data: Publication[] }>(
        buildUrl(pageParam ? String(pageParam) : null)
      );
      const items = res?.data || [];
      const registry = useEntityRegistryStore.getState();
      registry.ingestPublications(items, fetchedAt);
      const authors = items.flatMap((p) => [p?.author, p?.target_publication?.author]).filter(Boolean);
      if (authors.length > 0) registry.ingestUsers(authors as unknown as PublicUser[]);
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const posts = lastPage?.data || [];
      return posts.length >= limit ? posts[posts.length - 1]?.id : undefined;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled,
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, Boolean(query.hasNextPage));

  const posts = query.data?.pages.flatMap((page) => page.data || []) || [];

  return { ...query, posts, loadMoreRef };
}

