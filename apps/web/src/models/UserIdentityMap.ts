import { PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { hasVisualUserChange, mergeUserDefined, normalizeUserCounters } from './userModelHelpers.js';

type UserSyncListener = (user: PublicUser) => void;

export class UserIdentityMap {
  private static instance: UserIdentityMap;
  private users = new Map<string, PublicUser>();
  private fetchedAt = new Map<string, number>();
  private fullProfileAt = new Map<string, number>();
  private subject = new ObservableSubject();
  private syncListeners = new Set<UserSyncListener>();

  public static getInstance(): UserIdentityMap {
    if (!this.instance) this.instance = new UserIdentityMap();
    return this.instance;
  }

  public onUserSynced(listener: UserSyncListener): () => void {
    this.syncListeners.add(listener);
    return () => { this.syncListeners.delete(listener); };
  }

  private emitSync(user: PublicUser): void {
    for (const listener of Array.from(this.syncListeners)) listener(user);
  }

  public get(username?: string | null): PublicUser | undefined {
    return username ? this.users.get(username.toLowerCase()) : undefined;
  }

  public isStale(username?: string | null, ttlMs = 60_000, requireFull = false): boolean {
    if (!username) return true;
    const key = username.toLowerCase();
    const ts = requireFull ? (this.fullProfileAt.get(key) || 0) : (this.fetchedAt.get(key) || 0);
    return ts === 0 || Date.now() - ts >= ttlMs;
  }

  public subscribe(username: string, listener: Listener): () => void { return this.subject.subscribe(username, listener); }
  public subscribeGlobal(listener: Listener): () => void { return this.subject.subscribeGlobal(listener); }

  public seed(user?: PublicUser | null): void {
    if (!user?.username) return;
    const key = user.username.toLowerCase();
    if (!this.users.has(key)) {
      this.users.set(key, normalizeUserCounters(user));
      this.subject.notify(key);
    }
  }

  public ingest(items: Array<PublicUser | null | undefined>, fetchedAt = Date.now(), isFullProfile = false): void {
    const changed: string[] = [];
    for (const u of items) {
      if (!u?.username) continue;
      const key = u.username.toLowerCase();
      const prev = this.users.get(key);
      const prevFetched = this.fetchedAt.get(key) || 0;
      const prevFull = this.fullProfileAt.get(key) || 0;
      const allowOverwriteVisual = isFullProfile || (fetchedAt >= prevFull && fetchedAt >= prevFetched);
      const next = mergeUserDefined(prev, u, allowOverwriteVisual);
      this.users.set(key, next);
      this.fetchedAt.set(key, Math.max(prevFetched, fetchedAt));
      if (isFullProfile) this.fullProfileAt.set(key, Math.max(prevFull, fetchedAt));
      changed.push(key);
      if (hasVisualUserChange(prev, next) || (isFullProfile && !prev)) this.emitSync(next);
    }
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public patch(username: string, updater: (prev: PublicUser) => PublicUser): PublicUser | undefined {
    const key = username.toLowerCase();
    const current = this.users.get(key);
    if (!current) return undefined;
    const next = normalizeUserCounters(updater(current));
    const nextKey = next.username.toLowerCase();
    if (nextKey !== key) this.users.delete(key);
    this.users.set(nextKey, next);
    this.subject.notifyMany(nextKey !== key ? [key, nextKey] : [key]);
    if (hasVisualUserChange(current, next)) this.emitSync(next);
    return next;
  }

  public getAll(): PublicUser[] { return Array.from(this.users.values()); }
  public clear(): void { this.users.clear(); this.fetchedAt.clear(); this.fullProfileAt.clear(); this.subject.clear(); }
}

export const userIdentityMap = UserIdentityMap.getInstance();
