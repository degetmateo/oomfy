import { Notification, Publication, PublicUser } from '@oomfy/shared';
import { QueryClient, QueryKey } from '@tanstack/react-query';
import { chatIdentityMap, ChatSnapshot } from '../models/ChatIdentityMap.js';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import {
  CachedInteractionFlags,
  PublicationInteractionCache,
  publicationInteractionCache,
} from '../models/PublicationInteractionCache.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { safeLocalGet, safeLocalRemove, safeLocalSet } from '../utils/safeStorage.js';

export const CACHE_SCHEMA_VERSION = 2;
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PERSIST_STALE_OFFSET_MS = 11 * 60 * 1000;

export interface EntitiesSnapshot {
  version?: number;
  savedAt: number;
  publications: Publication[];
  users: PublicUser[];
  chatState?: ChatSnapshot;
  pubInteractions?: Array<[string, CachedInteractionFlags]>;
}

export function isFreshEntitiesSnapshot(entities: EntitiesSnapshot | null | undefined): entities is EntitiesSnapshot {
  return Boolean(
    entities &&
    entities.version === CACHE_SCHEMA_VERSION &&
    typeof entities.savedAt === 'number' &&
    Date.now() - entities.savedAt < PERSIST_MAX_AGE_MS
  );
}

export function trimQueryData(data: any): unknown {
  if (data && Array.isArray(data.pages)) {
    return {
      ...data,
      pages: data.pages.slice(0, 2),
      pageParams: Array.isArray(data.pageParams) ? data.pageParams.slice(0, 2) : data.pageParams,
    };
  }
  return data;
}

export function applyEntitiesSnapshot(entities: EntitiesSnapshot | null, preferOverwrite = false): boolean {
  if (!isFreshEntitiesSnapshot(entities)) return false;
  if (entities.pubInteractions?.length) publicationInteractionCache.hydrateEntries(entities.pubInteractions);
  const pinnedFromUsers = (entities.users || []).map((u) => u.pinned_publication).filter(Boolean) as Publication[];
  const allSeeds = [...(entities.publications || []), ...pinnedFromUsers];
  if (allSeeds.length) {
    if (preferOverwrite) publicationIdentityMap.ingest(allSeeds, entities.savedAt || Date.now(), false);
    else publicationIdentityMap.seed(allSeeds);
  }
  if (entities.users?.length) {
    const hydratedUsers = entities.users.map((u) =>
      !u.pinned_publication && u.pinned_publication_id
        ? { ...u, pinned_publication: publicationIdentityMap.get(u.pinned_publication_id) || null }
        : u
    );
    userIdentityMap.ingest(hydratedUsers, preferOverwrite ? (entities.savedAt || Date.now()) : 0, false);
  }
  if (entities.chatState) chatIdentityMap.hydrateSnapshot(entities.chatState);
  return true;
}

function buildCompactBootSnapshot(snapshot: EntitiesSnapshot, userLimit: number, pubLimit: number): EntitiesSnapshot {
  const pinnedUsers = snapshot.users.filter((u) => Boolean(u.pinned_publication_id));
  const pinnedUserSet = new Set(pinnedUsers.map((u) => u.username.toLowerCase()));
  const regularUsers = snapshot.users.filter((u) => !pinnedUserSet.has(u.username.toLowerCase()));
  const bootUsers = [
    ...regularUsers.slice(-Math.max(0, userLimit - Math.min(pinnedUsers.length, Math.floor(userLimit / 2)))),
    ...pinnedUsers.slice(-Math.floor(userLimit / 2)),
  ]
    .slice(-userLimit)
    .map((u) => ({ ...u, pinned_publication: null }));
  const pinnedPubs = pinnedUsers.map((u) => u.pinned_publication).filter(Boolean).slice(-Math.ceil(pubLimit / 2)) as Publication[];
  const pubMap = new Map<string, Publication>();
  for (const p of [...snapshot.publications.slice(-pubLimit), ...pinnedPubs]) {
    if (p?.id) pubMap.set(p.id.toLowerCase(), { ...p, author_thread_preview: undefined, subthread_preview: undefined });
  }
  return {
    version: CACHE_SCHEMA_VERSION,
    savedAt: snapshot.savedAt,
    publications: Array.from(pubMap.values()),
    users: bootUsers,
    chatState: snapshot.chatState ? { chats: snapshot.chatState.chats.slice(0, Math.min(20, userLimit)), messagesByChat: {} } : undefined,
  };
}

function evictOtherBootScopes(activeScope: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const activeKey = `oomfy_boot_entities_${activeScope}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('oomfy_boot_entities_') && k !== activeKey) safeLocalRemove(k);
    }
  } catch { /* ignore restricted storage */ }
}

export function saveBootEntitiesSync(scope: string, snapshot: EntitiesSnapshot): void {
  try {
    const key = `oomfy_boot_entities_${scope}`;
    const compact = buildCompactBootSnapshot(snapshot, 40, 25);
    if (safeLocalSet(key, JSON.stringify(compact))) return;

    // Storage quota hit: evict older account boot caches and retry with a smaller payload
    evictOtherBootScopes(scope);
    const smaller = buildCompactBootSnapshot(snapshot, 20, 12);
    if (!safeLocalSet(key, JSON.stringify(smaller))) {
      // Never leave an older stale boot snapshot behind when quota blocks writing fresh data
      safeLocalRemove(key);
    }
  } catch {
    safeLocalRemove(`oomfy_boot_entities_${scope}`);
  }
}

export function readBootEntitiesSync(scope: string): EntitiesSnapshot | null {
  try {
    const raw = safeLocalGet(`oomfy_boot_entities_${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntitiesSnapshot;
    if (!isFreshEntitiesSnapshot(parsed)) {
      safeLocalRemove(`oomfy_boot_entities_${scope}`);
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function hydratePersistedQuery(
  queryClient: QueryClient,
  queryKey: QueryKey,
  rawData: any,
  updatedAt: number,
  forceReplace = false
): boolean {
  if (!forceReplace && queryClient.getQueryData(queryKey) !== undefined) return false;
  let data = rawData;
  if (rawData && Array.isArray(rawData.pages) && Array.isArray(queryKey) && queryKey[0] === 'notifications-infinite-list') {
    const pages = rawData.pages.filter((p: any) => Array.isArray(p?.data?.notifications));
    if (pages.length === 0) return false;
    pages.forEach((p: any, idx: number) => {
      notificationIdentityMap.ingestPage(p.data.notifications as Notification[], idx === 0 ? p.data.pendingCount : undefined, idx > 0, 0);
    });
    const rawParams = Array.isArray(rawData.pageParams) ? rawData.pageParams : [];
    const pageParams = pages.map((_p: any, idx: number) => (idx === 0 ? '' : rawParams[idx]));
    data = { ...rawData, pages, pageParams };
  }
  queryClient.setQueryData(queryKey, data, { updatedAt });
  return true;
}

export function clearBootEntitiesSync(): void {
  try {
    publicationInteractionCache.clear();
    PublicationInteractionCache.clearAllStorage();
    if (typeof localStorage === 'undefined') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('oomfy_boot_entities_')) safeLocalRemove(k);
    }
  } catch { /* ignore restricted storage */ }
}
