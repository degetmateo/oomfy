import { QueryClient, QueryKey } from '@tanstack/react-query';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { clearLocalCacheDb, getCacheEntry, setCacheEntry } from './LocalCacheDb.js';
import {
  applyEntitiesSnapshot, clearBootEntitiesSync, EntitiesSnapshot, hydratePersistedQuery, PERSIST_MAX_AGE_MS,
  PERSIST_STALE_OFFSET_MS, readBootEntitiesSync, saveBootEntitiesSync, trimQueryData,
} from './localPersistenceHelpers.js';

const PERSISTED_PREFIXES = new Set([
  'feed', 'profile', 'user-posts', 'explore-posts', 'topic-hub',
  'suggested-members', 'chats', 'notifications-infinite-list', 'publication',
]);

interface SavedQuery { queryKey: QueryKey; data: unknown; }
interface QueriesSnapshot { savedAt: number; queries: SavedQuery[]; }

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
    const entitiesSnap: EntitiesSnapshot = {
      savedAt: now, publications: publicationIdentityMap.getAll().slice(-150),
      users: userIdentityMap.getAll().slice(-150), chatState: chatIdentityMap.exportSnapshot(),
    };
    saveBootEntitiesSync(scope, entitiesSnap);
    await Promise.all([
      setCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`, { savedAt: now, queries }),
      setCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`, entitiesSnap),
    ]);
  }

  public static async hydrateFromLocalDb(queryClient: QueryClient, scope = 'guest'): Promise<boolean> {
    this.activeScope = scope;
    let hydrated = applyEntitiesSnapshot(readBootEntitiesSync(scope));
    const [entities, snapshot] = await Promise.all([
      getCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`),
      getCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`),
    ]);
    if (applyEntitiesSnapshot(entities)) hydrated = true;

    if (snapshot && Date.now() - snapshot.savedAt < PERSIST_MAX_AGE_MS) {
      const staleTime = Math.max(0, Date.now() - PERSIST_STALE_OFFSET_MS);
      for (const item of snapshot.queries || []) {
        if (hydratePersistedQuery(queryClient, item.queryKey, item.data, staleTime)) hydrated = true;
      }
    }
    if (hydrated) queryClient.invalidateQueries({ refetchType: 'active' }).catch(() => {});
    return hydrated;
  }

  public static attachQueryPersistence(queryClient: QueryClient): () => void {
    const schedule = () => {
      if (this.writeTimer) clearTimeout(this.writeTimer);
      this.writeTimer = setTimeout(() => { this.persistSnapshot(queryClient, this.activeScope).catch(() => {}); }, 350);
    };
    const unsubQuery = queryClient.getQueryCache().subscribe((ev) => {
      if (ev.type !== 'updated' || ev.query.state.status !== 'success') return;
      const prefix = Array.isArray(ev.query.queryKey) ? String(ev.query.queryKey[0]) : '';
      if (PERSISTED_PREFIXES.has(prefix)) schedule();
    });
    const unsubPubs = publicationIdentityMap.subscribeGlobal(schedule);
    const unsubUsers = userIdentityMap.subscribeGlobal(schedule);
    const unsubChats = chatIdentityMap.subscribeGlobal(schedule);
    const onClear = () => {
      if (this.writeTimer) clearTimeout(this.writeTimer);
      clearBootEntitiesSync();
      clearLocalCacheDb().catch(() => {});
    };
    if (typeof window !== 'undefined') window.addEventListener('oomfy:clear-local-cache', onClear);
    return () => {
      unsubQuery(); unsubPubs(); unsubUsers(); unsubChats();
      if (this.writeTimer) clearTimeout(this.writeTimer);
      if (typeof window !== 'undefined') window.removeEventListener('oomfy:clear-local-cache', onClear);
    };
  }
}
