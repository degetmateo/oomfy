import { useInfiniteQuery, QueryKey } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
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
      useEntityRegistryStore.getState().ingestPublications(res?.data || [], fetchedAt);
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

