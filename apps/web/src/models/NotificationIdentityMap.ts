import { Notification, PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { userIdentityMap } from './UserIdentityMap.js';
import { publicationIdentityMap } from './PublicationIdentityMap.js';

export class NotificationIdentityMap {
  private static instance: NotificationIdentityMap;
  private byId = new Map<string, Notification>();
  private orderedIds: string[] = [];
  private listCache: Notification[] = [];
  private pendingCount = 0;
  private subject = new ObservableSubject();

  private constructor() { userIdentityMap.onUserSynced((u) => this.syncSender(u)); }
  public static getInstance(): NotificationIdentityMap { return (this.instance ??= new NotificationIdentityMap()); }

  private rebuildCache(): void { this.listCache = this.orderedIds.map((id) => this.byId.get(id)!).filter(Boolean); }
  public getNotifications(): Notification[] { return this.listCache; }
  public getPendingCount(): number { return this.pendingCount; }
  public subscribeList(l: Listener): () => void { return this.subject.subscribe('__list__', l); }
  public subscribeCount(l: Listener): () => void { return this.subject.subscribe('__count__', l); }

  private ingestRelatedEntities(items: Notification[], fetchedAt: number): void {
    const senders = items.map((n) => n.sender).filter((s) => Boolean(s?.username)) as unknown as PublicUser[];
    if (senders.length > 0) userIdentityMap.ingest(senders, fetchedAt, false);
    const pubs = items.map((n) => n.target_publication).filter(Boolean);
    if (pubs.length > 0) publicationIdentityMap.ingest(pubs, fetchedAt);
  }

  public ingestPage(items: Notification[], pendingCount?: number, append = false, fetchedAt = Date.now()): void {
    this.ingestRelatedEntities(items, fetchedAt);
    if (!append) {
      const seen = new Set(items.map((n) => n.id));
      this.orderedIds = [...items.map((n) => n.id), ...this.orderedIds.filter((id) => !seen.has(id))];
    } else {
      const existing = new Set(this.orderedIds);
      for (const n of items) if (!existing.has(n.id)) this.orderedIds.push(n.id);
    }
    for (const n of items) this.byId.set(n.id, n);
    if (typeof pendingCount === 'number') this.pendingCount = Math.max(0, pendingCount);
    this.rebuildCache();
    this.subject.notifyMany(['__list__', '__count__']);
  }

  public prependRealtime(notif: Notification): void {
    if (!notif?.id) return;
    this.ingestRelatedEntities([notif], Date.now());
    const isNew = !this.byId.has(notif.id);
    this.byId.set(notif.id, notif);
    if (isNew) {
      this.orderedIds = [notif.id, ...this.orderedIds];
      if (notif.status !== 'seen') this.pendingCount += 1;
    }
    this.rebuildCache();
    this.subject.notifyMany(['__list__', '__count__']);
  }

  public setPendingCount(count: number): void {
    const next = Math.max(0, count);
    if (next === this.pendingCount) return;
    this.pendingCount = next;
    this.subject.notify('__count__');
  }

  public markAllSeen(): void {
    for (const [id, n] of this.byId.entries()) if (n.status !== 'seen') this.byId.set(id, { ...n, status: 'seen' });
    this.pendingCount = 0;
    this.rebuildCache();
    this.subject.notifyMany(['__list__', '__count__']);
  }

  private syncSender(user: PublicUser): void {
    let changed = false;
    for (const [id, n] of this.byId.entries()) {
      if (n.sender?.id === user.id || n.sender?.username?.toLowerCase() === user.username.toLowerCase()) {
        this.byId.set(id, { ...n, sender: { ...n.sender, name: user.name, username: user.username, icon_url: user.icon_url, banner_url: user.banner_url, role: user.role } });
        changed = true;
      }
    }
    if (changed) { this.rebuildCache(); this.subject.notify('__list__'); }
  }

  public clear(): void {
    this.byId.clear(); this.orderedIds = []; this.listCache = []; this.pendingCount = 0;
    this.subject.notifyMany(['__list__', '__count__']);
  }
}

export const notificationIdentityMap = NotificationIdentityMap.getInstance();
