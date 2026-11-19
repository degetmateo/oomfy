import { Publication, PublicUser } from '@oomfy/shared';
import { chatIdentityMap, ChatSnapshot } from '../models/ChatIdentityMap.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { safeLocalGet, safeLocalRemove, safeLocalSet } from '../utils/safeStorage.js';

export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PERSIST_STALE_OFFSET_MS = 11 * 60 * 1000;

export interface EntitiesSnapshot {
  savedAt: number;
  publications: Publication[];
  users: PublicUser[];
  chatState?: ChatSnapshot;
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

export function applyEntitiesSnapshot(entities: EntitiesSnapshot | null): boolean {
  if (!entities || Date.now() - entities.savedAt >= PERSIST_MAX_AGE_MS) return false;
  if (entities.publications?.length) publicationIdentityMap.seed(entities.publications);
  if (entities.users?.length) userIdentityMap.ingest(entities.users, 0, false);
  if (entities.chatState) chatIdentityMap.hydrateSnapshot(entities.chatState);
  return true;
}

export function saveBootEntitiesSync(scope: string, snapshot: EntitiesSnapshot): void {
  try {
    const compact: EntitiesSnapshot = {
      savedAt: snapshot.savedAt,
      publications: snapshot.publications.slice(-25),
      users: snapshot.users.slice(-40),
      chatState: snapshot.chatState ? { chats: snapshot.chatState.chats.slice(0, 20), messagesByChat: {} } : undefined,
    };
    safeLocalSet(`oomfy_boot_entities_${scope}`, JSON.stringify(compact));
  } catch { /* ignore storage quota errors */ }
}

export function readBootEntitiesSync(scope: string): EntitiesSnapshot | null {
  try {
    const raw = safeLocalGet(`oomfy_boot_entities_${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntitiesSnapshot;
    return parsed && Date.now() - parsed.savedAt < PERSIST_MAX_AGE_MS ? parsed : null;
  } catch { return null; }
}

export function clearBootEntitiesSync(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('oomfy_boot_entities_')) safeLocalRemove(k);
    }
  } catch { /* ignore restricted storage */ }
}
