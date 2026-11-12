import { PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';

export class UserIdentityMap {
  private static instance: UserIdentityMap;
  private users = new Map<string, PublicUser>();
  private subject = new ObservableSubject();

  public static getInstance(): UserIdentityMap {
    if (!this.instance) this.instance = new UserIdentityMap();
    return this.instance;
  }

  public get(username?: string | null): PublicUser | undefined {
    if (!username) return undefined;
    return this.users.get(username.toLowerCase());
  }

  public subscribe(username: string, listener: Listener): () => void {
    return this.subject.subscribe(username, listener);
  }

  public seed(user?: PublicUser | null): void {
    if (!user?.username) return;
    const key = user.username.toLowerCase();
    if (!this.users.has(key)) {
      this.users.set(key, {
        ...user,
        follower_count: Math.max(0, user.follower_count || 0),
        followed_count: Math.max(0, user.followed_count || 0),
        publication_count: Math.max(0, user.publication_count || 0),
      });
      this.subject.notify(key);
    }
  }

  public ingest(items: Array<PublicUser | null | undefined>): void {
    for (const u of items) {
      if (!u?.username) continue;
      const key = u.username.toLowerCase();
      const prev = this.users.get(key);
      const merged = prev ? { ...prev, ...u } : u;
      const next: PublicUser = {
        ...merged,
        follower_count: Math.max(0, merged.follower_count || 0),
        followed_count: Math.max(0, merged.followed_count || 0),
        publication_count: Math.max(0, merged.publication_count || 0),
      };
      this.users.set(key, next);
      this.subject.notify(key);
    }
  }

  public patch(username: string, updater: (prev: PublicUser) => PublicUser): PublicUser | undefined {
    const key = username.toLowerCase();
    const current = this.users.get(key);
    if (!current) return undefined;
    const next = updater(current);
    this.users.set(key, next);
    this.subject.notify(key);
    return next;
  }

  public clear(): void {
    this.users.clear();
    this.subject.clear();
  }
}

export const userIdentityMap = UserIdentityMap.getInstance();

