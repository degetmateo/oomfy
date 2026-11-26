import { Publication, PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { collectPublications, mergePublicationEntity } from '../stores/entityMergeHelpers.js';
import { userIdentityMap } from './UserIdentityMap.js';
import { applyCanonicalAuthors, normalizePubCounters, patchPubAuthor } from './publicationModelHelpers.js';
import { publicationInteractionCache } from './PublicationInteractionCache.js';

function withInteractionFlags(pub: Publication, preferCache: boolean): Publication {
  const next = publicationInteractionCache.applyTo(pub, preferCache);
  if (next.target_publication) {
    return { ...next, target_publication: publicationInteractionCache.applyTo(next.target_publication, preferCache) };
  }
  return next;
}

export class PublicationIdentityMap {
  private static readonly MAX_ENTITIES = 400;
  private static instance: PublicationIdentityMap;
  private entities = new Map<string, Publication>();
  private inFlight = new Map<string, number>();
  private mutatedAt = new Map<string, number>();
  private fetchedAt = new Map<string, number>();
  private subject = new ObservableSubject();

  private constructor() {
    userIdentityMap.onUserSynced((u) => this.syncAuthor(u));
    userIdentityMap.onPinnedPublication((pub, mode, fetchedAt) => {
      if (mode === 'seed' || fetchedAt === 0) this.seed([pub]);
      else this.ingest([pub], fetchedAt);
    });
    for (const u of userIdentityMap.getAll()) {
      if (u.pinned_publication) this.seed([u.pinned_publication]);
    }
  }
  public static getInstance(): PublicationIdentityMap {
    if (!this.instance) this.instance = new PublicationIdentityMap();
    return this.instance;
  }

  private touch(key: string, value?: Publication): void {
    const existing = value ?? this.entities.get(key);
    if (!existing) return;
    this.entities.delete(key);
    this.entities.set(key, existing);
  }

  private evictIfNeeded(): void {
    if (this.entities.size <= PublicationIdentityMap.MAX_ENTITIES) return;
    for (const key of this.entities.keys()) {
      if (this.entities.size <= PublicationIdentityMap.MAX_ENTITIES) break;
      if ((this.inFlight.get(key) || 0) > 0) continue;
      this.entities.delete(key);
      this.fetchedAt.delete(key);
      this.mutatedAt.delete(key);
    }
  }

  public get(id?: string | null): Publication | undefined {
    if (!id) return undefined;
    const key = id.toLowerCase();
    const found = this.entities.get(key);
    if (found) this.touch(key, found);
    return found;
  }
  public getFetchedAt(id?: string | null): number { return id ? (this.fetchedAt.get(id.toLowerCase()) || 0) : 0; }
  public isStale(id?: string | null, ttlMs = 60_000): boolean {
    const ts = this.getFetchedAt(id);
    return ts === 0 || Date.now() - ts >= ttlMs;
  }

  public getByAuthor(username: string): Publication[] {
    const target = username.toLowerCase();
    return Array.from(this.entities.values())
      .filter((p) => p.type !== 'reply' && p.author?.username?.toLowerCase() === target)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public subscribe(id: string, listener: Listener): () => void { return this.subject.subscribe(id, listener); }
  public subscribeGlobal(listener: Listener): () => void { return this.subject.subscribeGlobal(listener); }

  public seed(items: Array<Publication | null | undefined>): void {
    const changed: string[] = [];
    for (const [id, pub] of collectPublications(items).entries()) {
      const key = id.toLowerCase();
      publicationInteractionCache.record(key, pub, 0);
      if (!this.entities.has(key)) {
        this.entities.set(
          key,
          applyCanonicalAuthors(normalizePubCounters(withInteractionFlags(pub, true)), (un) => userIdentityMap.get(un))
        );
        changed.push(key);
      }
    }
    this.evictIfNeeded();
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public ingest(items: Array<Publication | null | undefined>, fetchedAt = Date.now(), markFetched = true): void {
    const changed: string[] = [];
    for (const [id, incoming] of collectPublications(items).entries()) {
      const key = id.toLowerCase();
      const prev = this.entities.get(key);
      const keepLocal = (this.inFlight.get(key) || 0) > 0 || (this.mutatedAt.get(key) || 0) >= fetchedAt;
      if (!keepLocal) publicationInteractionCache.record(key, incoming, fetchedAt);
      const canonical = applyCanonicalAuthors(
        withInteractionFlags(incoming, fetchedAt === 0),
        (un) => userIdentityMap.get(un)
      );
      const merged = mergePublicationEntity(prev, canonical, keepLocal);
      if (markFetched && fetchedAt > 0) this.fetchedAt.set(key, Math.max(this.fetchedAt.get(key) || 0, fetchedAt));
      if (prev !== merged) {
        this.touch(key, merged);
        if (!this.entities.has(key)) this.entities.set(key, merged);
        changed.push(key);
      } else if (prev) {
        this.touch(key, prev);
      }
    }
    this.evictIfNeeded();
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public patch(id: string, updater: (prev: Publication) => Publication, markMutated = true): Publication | undefined {
    const key = id.toLowerCase();
    const current = this.entities.get(key);
    if (!current) return undefined;
    const next = normalizePubCounters(updater(current));
    this.touch(key, next);
    const now = Date.now();
    publicationInteractionCache.record(key, next, markMutated ? now : 0);
    if (markMutated) this.mutatedAt.set(key, now);
    this.subject.notify(key);
    return next;
  }

  public syncAuthor(user: Partial<PublicUser> & { username: string; id?: string }): void {
    const changed: string[] = [];
    for (const [key, pub] of this.entities.entries()) {
      const nextPub = patchPubAuthor(pub, user);
      if (nextPub !== pub) { this.entities.set(key, nextPub); changed.push(key); }
    }
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public remove(id: string): void {
    const key = id.toLowerCase();
    userIdentityMap.clearPinnedPublication(id);
    if (this.entities.delete(key)) {
      this.fetchedAt.delete(key); this.mutatedAt.delete(key); this.inFlight.delete(key);
      this.subject.notify(key);
    }
  }

  public setInFlight(id: string, delta: 1 | -1): void {
    const key = id.toLowerCase();
    const count = Math.max(0, (this.inFlight.get(key) || 0) + delta);
    if (count === 0) this.inFlight.delete(key); else this.inFlight.set(key, count);
  }

  public getAll(): Publication[] { return Array.from(this.entities.values()); }
  public clear(): void {
    this.entities.clear(); this.inFlight.clear(); this.mutatedAt.clear(); this.fetchedAt.clear();
    publicationInteractionCache.clear();
    this.subject.clear();
  }
}

export const publicationIdentityMap = PublicationIdentityMap.getInstance();
