import { QueryClient } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ApiClient } from './api.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';
import { ImageMemoryCache } from '../utils/imageCache.js';

const PREFETCH_STALE_MS = 2 * 60 * 1000;
const STATIC_TOP_ROUTES = new Set([
  'signin', 'signup', 'verify', 'reset-password', 'explore', 'notifications',
  'chats', 'settings', 'admin', 'moderation', 'terms', 'privacy', 'external',
]);

export class RoutePrefetchService {
  private static async fetchCursorPage(url: string): Promise<{ success: boolean; data: Publication[] }> {
    const fetchedAt = Date.now();
    const res = await ApiClient.get<{ success: boolean; data: Publication[] }>(url);
    const items = res?.data || [];
    const registry = useEntityRegistryStore.getState();
    registry.ingestPublications(items, fetchedAt);
    const authors = items.flatMap((p) => [p?.author, p?.target_publication?.author]).filter(Boolean);
    if (authors.length > 0) {
      registry.ingestUsers(authors as unknown as PublicUser[]);
      authors.forEach((a) => a?.icon_url && ImageMemoryCache.preload(resolveMediaUrl(a.icon_url)));
    }
    return res;
  }

  public static prefetchProfileTab(queryClient: QueryClient, username: string, tab: 'posts' | 'replies' | 'likes'): void {
    const p = new URLSearchParams({ limit: '20' });
    if (tab === 'likes') p.append('liked_by', username);
    else { p.append('author_username', username); p.append('type', tab === 'replies' ? 'reply' : 'posts'); }
    queryClient.prefetchInfiniteQuery({
      queryKey: ['user-posts', username, tab],
      queryFn: () => this.fetchCursorPage(`/publications?${p.toString()}`),
      initialPageParam: null as string | null,
      staleTime: PREFETCH_STALE_MS,
    }).catch(() => {});
  }

  public static prefetchRouteData(queryClient: QueryClient, path: string): void {
    const cleanPath = path.split('?')[0];
    if (cleanPath === '/') {
      queryClient.prefetchInfiniteQuery({
        queryKey: ['feed'],
        queryFn: () => this.fetchCursorPage('/publications?limit=20'),
        initialPageParam: null as string | null,
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
      return;
    }
    if (cleanPath === '/explore') {
      const filters = { author: '', since: '', until: '', hasMedia: false };
      queryClient.prefetchInfiniteQuery({
        queryKey: ['explore-posts', '', filters],
        queryFn: () => this.fetchCursorPage('/publications?limit=20'),
        initialPageParam: null as string | null,
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
      return;
    }
    if (cleanPath === '/notifications') {
      queryClient.prefetchInfiniteQuery({
        queryKey: ['notifications-infinite-list'],
        queryFn: () => ApiClient.get<any>('/notifications?limit=20'),
        initialPageParam: null as string | null,
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
      return;
    }
    if (cleanPath === '/chats') {
      queryClient.prefetchQuery({
        queryKey: ['chats'],
        queryFn: () => ApiClient.get<any>('/chats'),
        staleTime: PREFETCH_STALE_MS,
      }).catch(() => {});
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
            useEntityRegistryStore.getState().ingestUsers([res.data]);
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
