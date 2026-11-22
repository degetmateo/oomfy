import { Publication } from '@oomfy/shared';
import { safeLocalGet, safeLocalRemove, safeLocalSet } from '../utils/safeStorage.js';

export interface CachedInteractionFlags {
  is_upvoted?: boolean;
  is_shared?: boolean;
  is_quoted?: boolean;
  updatedAt: number;
}

const MAX_ENTRIES = 500;
const STORAGE_PREFIX = 'oomfy_pub_interactions_';

export class PublicationInteractionCache {
  private static instance: PublicationInteractionCache;
  private map = new Map<string, CachedInteractionFlags>();

  public static getInstance(): PublicationInteractionCache {
    if (!this.instance) this.instance = new PublicationInteractionCache();
    return this.instance;
  }

  public get(id?: string | null): CachedInteractionFlags | undefined {
    return id ? this.map.get(id.toLowerCase()) : undefined;
  }

  public record(
    id: string,
    patch: Partial<Pick<CachedInteractionFlags, 'is_upvoted' | 'is_shared' | 'is_quoted'>>,
    ts = Date.now()
  ): void {
    const key = id.toLowerCase();
    const hasAny =
      typeof patch.is_upvoted === 'boolean' ||
      typeof patch.is_shared === 'boolean' ||
      typeof patch.is_quoted === 'boolean';
    if (!hasAny) return;
    const prev = this.map.get(key);
    if (prev && ts < prev.updatedAt && ts !== 0) return;
    const next: CachedInteractionFlags = {
      is_upvoted: typeof patch.is_upvoted === 'boolean' ? patch.is_upvoted : prev?.is_upvoted,
      is_shared: typeof patch.is_shared === 'boolean' ? patch.is_shared : prev?.is_shared,
      is_quoted: typeof patch.is_quoted === 'boolean' ? patch.is_quoted : prev?.is_quoted,
      updatedAt: Math.max(prev?.updatedAt || 0, ts),
    };
    this.map.delete(key);
    this.map.set(key, next);
    while (this.map.size > MAX_ENTRIES) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  public applyTo(pub: Publication, preferCacheWhenFresh = false): Publication {
    const key = pub.id?.toLowerCase();
    if (!key) return pub;
    const cached = this.map.get(key);
    if (!cached) return pub;
    return {
      ...pub,
      is_upvoted: preferCacheWhenFresh ? (cached.is_upvoted ?? pub.is_upvoted) : (pub.is_upvoted ?? cached.is_upvoted),
      is_shared: preferCacheWhenFresh ? (cached.is_shared ?? pub.is_shared) : (pub.is_shared ?? cached.is_shared),
      is_quoted: preferCacheWhenFresh ? (cached.is_quoted ?? pub.is_quoted) : (pub.is_quoted ?? cached.is_quoted),
    };
  }

  public exportEntries(): Array<[string, CachedInteractionFlags]> {
    return Array.from(this.map.entries()).slice(-MAX_ENTRIES);
  }

  public hydrateEntries(entries?: Array<[string, CachedInteractionFlags]>): void {
    if (!Array.isArray(entries)) return;
    for (const [id, flags] of entries) {
      if (typeof id === 'string' && flags && typeof flags === 'object') {
        this.record(id, flags, typeof flags.updatedAt === 'number' ? flags.updatedAt : 0);
      }
    }
  }

  public saveSync(scope: string): void {
    try { safeLocalSet(`${STORAGE_PREFIX}${scope}`, JSON.stringify(this.exportEntries())); } catch { /* ignore quota */ }
  }

  public loadSync(scope: string): boolean {
    try {
      const raw = safeLocalGet(`${STORAGE_PREFIX}${scope}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      this.hydrateEntries(parsed);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch { return false; }
  }

  public clear(): void { this.map.clear(); }

  public static clearAllStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) safeLocalRemove(k);
      }
    } catch { /* ignore restricted storage */ }
  }
}

export const publicationInteractionCache = PublicationInteractionCache.getInstance();
