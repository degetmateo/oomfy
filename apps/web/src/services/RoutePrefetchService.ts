import { QueryClient } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ApiClient } from './api.js';
import { NotificationController } from '../controllers/NotificationController.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';
import { ImageMemoryCache } from '../utils/imageCache.js';

const PREFETCH_STALE_MS = 2 * 60 * 1000;
const STATIC_TOP_ROUTES = new Set([
  'signin', 'signup', 'verify', 'reset-password', 'explore', 'notifications',
  'chats', 'settings', 'admin', 'moderation', 'terms', 'privacy', 'external',
]);
const nextCursorParam = (lastPage: { data?: Publication[] }) =>
  Array.isArray(lastPage?.data) && lastPage.data.length >= 20 ? lastPage.data[lastPage.data.length - 1]?.id : undefined;

export class RoutePrefetchService {
  private static async fetchCursorPage(url: string): Promise<{ success: boolean; data: Publication[] }> {
    const fetchedAt = Date.now();
    const res = await ApiClient.get<{ success: boolean; data: Publication[] }>(url);
    const items = res?.data || [];
    const registry = useEntityRegistryStore.getState();
    registry.ingestPublications(items, fetchedAt);
    const authors = items.flatMap((p) => [p?.author, p?.target_publication?.author]).filter(Boolean);
    if (authors.length > 0) {
      registry.ingestUsers(authors as unknown as PublicUser[], fetchedAt);
      authors.forEach((a) => a?.icon_url && ImageMemoryCache.preload(resolveMediaUrl(a.icon_url)));
    }
    return res;
  }

  private static prefetchCursorFeed(queryClient: QueryClient, queryKey: unknown[], baseUrl: string): void {
    const sep = baseUrl.includes('?') ? '&' : '?';
    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => this.fetchCursorPage(pageParam ? `${baseUrl}${sep}older_id=${pageParam}` : baseUrl),
      initialPageParam: null as string | null,
      getNextPageParam: nextCursorParam,
      staleTime: PREFETCH_STALE_MS,
    }).catch(() => {});
  }

  public static prefetchProfileTab(queryClient: QueryClient, username: string, tab: 'posts' | 'replies' | 'likes'): void {
    const p = new URLSearchParams({ limit: '20' });
    if (tab === 'likes') p.append('liked_by', username);
    else { p.append('author_username', username); p.append('type', tab === 'replies' ? 'reply' : 'posts'); }
    this.prefetchCursorFeed(queryClient, ['user-posts', username, tab], `/publications?${p.toString()}`);
  }

  public static prefetchRouteData(queryClient: QueryClient, path: string): void {
    const cleanPath = path.split('?')[0];
    if (cleanPath === '/') {
      this.prefetchCursorFeed(queryClient, ['feed', 'global'], '/publications?limit=20');
      return;
    }
    if (cleanPath === '/explore') {
      const filters = { author: '', since: '', until: '', hasMedia: false };
      this.prefetchCursorFeed(queryClient, ['explore-posts', '', filters], '/publications?limit=20');
      return;
    }
    if (cleanPath === '/notifications') {
      queryClient.prefetchInfiniteQuery({
        queryKey: ['notifications-infinite-list'],
        queryFn: ({ pageParam }) => NotificationController.fetchPage(pageParam ? String(pageParam) : undefined),
        initialPageParam: '' as string,
        getNextPageParam: NotificationController.getNextPageParam,
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
      return;
    }
    if (cleanPath === '/chats') {
      queryClient.prefetchQuery({ queryKey: ['chats'], queryFn: () => ApiClient.get<any>('/chats'), staleTime: PREFETCH_STALE_MS }).catch(() => {});
      return;
    }
    const profileMatch = cleanPath.match(/^\/([a-zA-Z0-9_]{3,30})$/);
    if (profileMatch && !STATIC_TOP_ROUTES.has(profileMatch[1].toLowerCase())) {
      const username = profileMatch[1];
      queryClient.prefetchQuery({
        queryKey: ['profile', username],
        queryFn: async () => {
          const res = await ApiClient.get<{ success: boolean; data: PublicUser }>(`/members/${username}`);
          if (res?.data) {
            userIdentityMap.ingest([res.data], Date.now(), true);
            if (res.data.icon_url) ImageMemoryCache.preload(resolveMediaUrl(res.data.icon_url));
          }
          return res;
        },
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
      this.prefetchProfileTab(queryClient, username, 'posts');
    }
  }
}
