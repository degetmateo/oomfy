import { QueryClient, QueryKey } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { clearLocalCacheDb, getCacheEntry, setCacheEntry } from './LocalCacheDb.js';

const PERSISTED_PREFIXES = new Set([
  'feed', 'profile', 'user-posts', 'explore-posts', 'topic-hub',
  'online-members', 'suggested-members', 'chats', 'notifications-infinite-list',
]);
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STALE_OFFSET_MS = 11 * 60 * 1000;

interface SavedQuery { queryKey: QueryKey; data: unknown; }
interface QueriesSnapshot { savedAt: number; queries: SavedQuery[]; }
interface EntitiesSnapshot { savedAt: number; publications: Publication[]; users: PublicUser[]; }

function trimQueryData(data: any): unknown {
  if (data && Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.slice(0, 2), pageParams: Array.isArray(data.pageParams) ? data.pageParams.slice(0, 2) : data.pageParams };
  }
  return data;
}

export class QueryPersistenceService {
  private static writeTimer: ReturnType<typeof setTimeout> | null = null;
  private static activeScope = 'guest';

  public static setScope(userId?: string | null): string {
    this.activeScope = userId || 'guest';
    return this.activeScope;
  }

  public static async persistSnapshot(queryClient: QueryClient, scope = this.activeScope): Promise<void> {
    const queries: SavedQuery[] = [];
    for (const q of queryClient.getQueryCache().getAll()) {
      const prefix = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : '';
      if (q.state.status === 'success' && q.state.data !== undefined && PERSISTED_PREFIXES.has(prefix)) {
        queries.push({ queryKey: q.queryKey, data: trimQueryData(q.state.data) });
      }
      if (queries.length >= 40) break;
    }
    const now = Date.now();
    await Promise.all([
      setCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`, { savedAt: now, queries }),
      setCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`, { savedAt: now, publications: publicationIdentityMap.getAll().slice(-150), users: userIdentityMap.getAll().slice(-150) }),
    ]);
  }

  public static async hydrateFromLocalDb(queryClient: QueryClient, scope = 'guest'): Promise<boolean> {
    this.activeScope = scope;
    const [entities, snapshot] = await Promise.all([
      getCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`),
      getCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`),
    ]);
    const now = Date.now();
    let hydrated = false;

    if (entities && now - entities.savedAt < MAX_AGE_MS) {
      if (entities.publications?.length) publicationIdentityMap.seed(entities.publications);
      if (entities.users?.length) userIdentityMap.ingest(entities.users);
      hydrated = true;
    }

    if (snapshot && now - snapshot.savedAt < MAX_AGE_MS) {
      const staleTime = Math.max(0, now - STALE_OFFSET_MS);
      for (const item of snapshot.queries || []) {
        if (queryClient.getQueryData(item.queryKey) === undefined) {
          queryClient.setQueryData(item.queryKey, item.data, { updatedAt: staleTime });
          hydrated = true;
        }
      }
    }
    return hydrated;
  }

  public static attachQueryPersistence(queryClient: QueryClient): () => void {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.query.state.status !== 'success') return;
      const prefix = Array.isArray(event.query.queryKey) ? String(event.query.queryKey[0]) : '';
      if (!PERSISTED_PREFIXES.has(prefix)) return;
      if (this.writeTimer) clearTimeout(this.writeTimer);
      this.writeTimer = setTimeout(() => { this.persistSnapshot(queryClient, this.activeScope).catch(() => {}); }, 350);
    });
    const onClear = () => {
      if (this.writeTimer) clearTimeout(this.writeTimer);
      clearLocalCacheDb().catch(() => {});
    };
    if (typeof window !== 'undefined') window.addEventListener('oomfy:clear-local-cache', onClear);
    return () => {
      unsub();
      if (this.writeTimer) clearTimeout(this.writeTimer);
      if (typeof window !== 'undefined') window.removeEventListener('oomfy:clear-local-cache', onClear);
    };
  }
}
