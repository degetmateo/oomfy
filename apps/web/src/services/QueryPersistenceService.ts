import { hashKey, QueryClient, QueryKey } from '@tanstack/react-query';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { publicationInteractionCache } from '../models/PublicationInteractionCache.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';
import { clearLocalCacheDb, getCacheEntry, setCacheEntry } from './LocalCacheDb.js';
import {
  applyEntitiesSnapshot, CACHE_SCHEMA_VERSION, clearBootEntitiesSync, EntitiesSnapshot,
  hydratePersistedQuery, isFreshEntitiesSnapshot, PERSIST_MAX_AGE_MS, PERSIST_STALE_OFFSET_MS,
  readBootEntitiesSync, saveBootEntitiesSync, trimQueryData,
} from './localPersistenceHelpers.js';

const PERSISTED_PREFIXES = new Set([
  'feed', 'profile', 'user-posts', 'explore-posts', 'topic-hub',
  'suggested-members', 'chats', 'notifications-infinite-list', 'publication',
  'publication-interactions-users', 'publication-quotes',
]);
const CORE_PREFIXES = new Set(['feed', 'profile', 'user-posts', 'chats', 'notifications-infinite-list', 'publication']);
const MAX_PERSISTED_QUERIES = 50;

interface SavedQuery {
  queryKey: QueryKey;
  data: unknown;
  dataUpdatedAt: number;
  lastAccessedAt: number;
}
interface QueriesSnapshot {
  version?: number;
  savedAt: number;
  queries: SavedQuery[];
}

function getQueryTier(prefix: string): number {
  if (prefix === 'feed') return 0;
  if (CORE_PREFIXES.has(prefix)) return 1;
  return 2;
}

export class QueryPersistenceService {
  private static writeTimer: ReturnType<typeof setTimeout> | null = null;
  private static activeScope = 'guest';
  private static hydratedScope: string | null = null;
  private static isHydrating = false;
  private static hydrationSeq = 0;
  private static queryTimestamps = new Map<string, { fetchedAt: number; lastAccessedAt: number }>();

  public static setScope(userId?: string | null): string {
    this.activeScope = userId || 'guest';
    return this.activeScope;
  }

  public static resetRuntimeState(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.isHydrating = false;
    this.hydratedScope = null;
    this.queryTimestamps.clear();
  }

  private static clearScopedRuntime(queryClient: QueryClient): void {
    queryClient.removeQueries({
      predicate: (q) => Array.isArray(q.queryKey) && PERSISTED_PREFIXES.has(String(q.queryKey[0])),
    });
    publicationIdentityMap.clear();
    userIdentityMap.clear();
    chatIdentityMap.clear();
    notificationIdentityMap.clear();
    this.queryTimestamps.clear();
  }

  public static async persistSnapshot(queryClient: QueryClient, scope = this.activeScope): Promise<void> {
    if (this.isHydrating) return;
    const now = Date.now();
    const candidates: Array<SavedQuery & { tier: number }> = [];

    for (const q of queryClient.getQueryCache().getAll()) {
      const prefix = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : '';
      if (q.state.status !== 'success' || q.state.data === undefined || !PERSISTED_PREFIXES.has(prefix)) continue;

      const keyId = hashKey(q.queryKey);
      const tracked = this.queryTimestamps.get(keyId);
      const fetchedAt = tracked?.fetchedAt || q.state.dataUpdatedAt || now;
      if (now - fetchedAt >= PERSIST_MAX_AGE_MS) continue;

      candidates.push({
        tier: getQueryTier(prefix),
        queryKey: q.queryKey,
        data: trimQueryData(q.state.data),
        dataUpdatedAt: fetchedAt,
        lastAccessedAt: tracked?.lastAccessedAt || fetchedAt,
      });
    }

    candidates.sort((a, b) =>
      a.tier - b.tier ||
      b.lastAccessedAt - a.lastAccessedAt ||
      b.dataUpdatedAt - a.dataUpdatedAt
    );

    const queries: SavedQuery[] = candidates
      .slice(0, MAX_PERSISTED_QUERIES)
      .map(({ queryKey, data, dataUpdatedAt, lastAccessedAt }) => ({
        queryKey,
        data,
        dataUpdatedAt,
        lastAccessedAt,
      }));

    const users = userIdentityMap.getAll().slice(-150);
    const pubMap = new Map(publicationIdentityMap.getAll().slice(-150).map((p) => [p.id.toLowerCase(), p]));
    for (const u of users) {
      if (u.pinned_publication?.id) pubMap.set(u.pinned_publication.id.toLowerCase(), u.pinned_publication);
    }
    const entitiesSnap: EntitiesSnapshot = {
      version: CACHE_SCHEMA_VERSION,
      savedAt: now,
      publications: Array.from(pubMap.values()),
      users,
      chatState: chatIdentityMap.exportSnapshot(),
      pubInteractions: publicationInteractionCache.exportEntries(),
    };
    saveBootEntitiesSync(scope, entitiesSnap);
    publicationInteractionCache.saveSync(scope);
    await Promise.all([
      setCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`, { version: CACHE_SCHEMA_VERSION, savedAt: now, queries }, scope),
      setCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`, entitiesSnap, scope),
    ]);
  }

  public static async hydrateFromLocalDb(queryClient: QueryClient, scope = 'guest'): Promise<boolean> {
    const seq = ++this.hydrationSeq;
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    if (this.hydratedScope && this.hydratedScope !== scope) {
      this.clearScopedRuntime(queryClient);
    }
    this.activeScope = scope;
    this.isHydrating = true;

    try {
      let hydrated = publicationInteractionCache.loadSync(scope);
      const bootEntities = readBootEntitiesSync(scope);
      if (applyEntitiesSnapshot(bootEntities, false)) hydrated = true;

      const [idbEntities, snapshot] = await Promise.all([
        getCacheEntry<EntitiesSnapshot>(`oomfy_entities_${scope}`),
        getCacheEntry<QueriesSnapshot>(`oomfy_queries_${scope}`),
      ]);
      if (seq !== this.hydrationSeq) return hydrated;

      if (isFreshEntitiesSnapshot(idbEntities)) {
        const idbIsNewerOrEqual = !bootEntities || idbEntities.savedAt >= bootEntities.savedAt;
        if (applyEntitiesSnapshot(idbEntities, idbIsNewerOrEqual)) hydrated = true;
      }

      const now = Date.now();
      if (snapshot && snapshot.version === CACHE_SCHEMA_VERSION && now - snapshot.savedAt < PERSIST_MAX_AGE_MS) {
        const staleCap = Math.max(0, now - PERSIST_STALE_OFFSET_MS);
        for (const item of snapshot.queries || []) {
          const itemFetchedAt = typeof item.dataUpdatedAt === 'number' ? item.dataUpdatedAt : snapshot.savedAt;
          if (now - itemFetchedAt >= PERSIST_MAX_AGE_MS) continue;
          const lastAccessedAt = typeof item.lastAccessedAt === 'number' ? item.lastAccessedAt : itemFetchedAt;
          const hydratedUpdatedAt = Math.min(itemFetchedAt, staleCap);
          if (hydratePersistedQuery(queryClient, item.queryKey, item.data, hydratedUpdatedAt)) {
            this.queryTimestamps.set(hashKey(item.queryKey), { fetchedAt: itemFetchedAt, lastAccessedAt });
            hydrated = true;
          }
        }
      }

      this.hydratedScope = scope;
      if (hydrated) queryClient.invalidateQueries({ refetchType: 'active' }).catch(() => {});
      return hydrated;
    } finally {
      if (seq === this.hydrationSeq) this.isHydrating = false;
    }
  }

  public static attachQueryPersistence(queryClient: QueryClient): () => void {
    const schedule = () => {
      if (this.isHydrating) return;
      if (this.writeTimer) clearTimeout(this.writeTimer);
      this.writeTimer = setTimeout(() => {
        this.writeTimer = null;
        this.persistSnapshot(queryClient, this.activeScope).catch(() => {});
      }, 350);
    };
    const flushNow = () => {
      if (this.isHydrating) return;
      if (this.writeTimer) {
        clearTimeout(this.writeTimer);
        this.writeTimer = null;
      }
      this.persistSnapshot(queryClient, this.activeScope).catch(() => {});
    };

    const unsubQuery = queryClient.getQueryCache().subscribe((ev) => {
      if (this.isHydrating) return;
      const prefix = Array.isArray(ev.query.queryKey) ? String(ev.query.queryKey[0]) : '';
      if (!PERSISTED_PREFIXES.has(prefix)) return;

      const keyId = hashKey(ev.query.queryKey);
      if (ev.type === 'observerAdded' && ev.query.state.status === 'success') {
        const prev = this.queryTimestamps.get(keyId);
        const now = Date.now();
        this.queryTimestamps.set(keyId, { fetchedAt: prev?.fetchedAt || ev.query.state.dataUpdatedAt || now, lastAccessedAt: now });
        return;
      }
      if (ev.type === 'updated' && ev.query.state.status === 'success') {
        const now = Date.now();
        const prev = this.queryTimestamps.get(keyId);
        const isFetchSuccess = ev.action?.type === 'success' || (ev.query.state.dataUpdatedAt > (prev?.fetchedAt || 0));
        this.queryTimestamps.set(keyId, {
          fetchedAt: isFetchSuccess ? (ev.query.state.dataUpdatedAt || now) : (prev?.fetchedAt || now),
          lastAccessedAt: now,
        });
        schedule();
      }
    });
    const unsubPubs = publicationIdentityMap.subscribeGlobal(schedule);
    const unsubUsers = userIdentityMap.subscribeGlobal(schedule);
    const unsubChats = chatIdentityMap.subscribeGlobal(schedule);
    const onClear = () => {
      this.resetRuntimeState();
      clearBootEntitiesSync();
      clearLocalCacheDb().catch(() => {});
    };
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flushNow();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('oomfy:clear-local-cache', onClear);
      window.addEventListener('pagehide', flushNow);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return () => {
      unsubQuery(); unsubPubs(); unsubUsers(); unsubChats();
      if (this.writeTimer) { clearTimeout(this.writeTimer); this.writeTimer = null; }
      if (typeof window !== 'undefined') {
        window.removeEventListener('oomfy:clear-local-cache', onClear);
        window.removeEventListener('pagehide', flushNow);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }
}
