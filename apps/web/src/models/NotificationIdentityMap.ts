import { AuthorSnapshot, Notification, PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { userIdentityMap } from './UserIdentityMap.js';
import { publicationIdentityMap } from './PublicationIdentityMap.js';

function isGroupedInteractionNotif(n: Notification): boolean {
  return Boolean((n.type === 'upvote' || n.type === 'share') && n.target_publication_id);
}

export class NotificationIdentityMap {
  private static readonly MAX_NOTIFICATIONS = 500;
  private static instance: NotificationIdentityMap;
  private byId = new Map<string, Notification>();
  private orderedIds: string[] = [];
  private listCache: Notification[] = [];
  private pendingCount = 0;
  private subject = new ObservableSubject();

  private constructor() { userIdentityMap.onUserSynced((u) => this.syncSender(u)); }
  public static getInstance(): NotificationIdentityMap { return (this.instance ??= new NotificationIdentityMap()); }

  private trimToMax(): void {
    if (this.orderedIds.length <= NotificationIdentityMap.MAX_NOTIFICATIONS) return;
    const dropped = this.orderedIds.slice(NotificationIdentityMap.MAX_NOTIFICATIONS);
    this.orderedIds = this.orderedIds.slice(0, NotificationIdentityMap.MAX_NOTIFICATIONS);
    for (const id of dropped) this.byId.delete(id);
  }

  private rebuildCache(): void {
    this.trimToMax();
    this.listCache = this.orderedIds.map((id) => this.byId.get(id)!).filter(Boolean);
  }
  public getNotifications(): Notification[] { return this.listCache; }
  public getPendingCount(): number { return this.pendingCount; }
  public subscribeList(l: Listener): () => void { return this.subject.subscribe('__list__', l); }
  public subscribeCount(l: Listener): () => void { return this.subject.subscribe('__count__', l); }

  private ingestRelatedEntities(items: Notification[], fetchedAt: number): void {
    const users = items.flatMap((n) => [n.sender, ...(n.actors || [])]).filter((s) => Boolean(s?.username)) as unknown as PublicUser[];
    if (users.length > 0) userIdentityMap.ingest(users, fetchedAt, false);
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

    const isGrouped = isGroupedInteractionNotif(notif);
    let existingMatch: Notification | undefined = this.byId.get(notif.id);
    const idsToReplace = new Set<string>([notif.id]);

    if (isGrouped) {
      const targetPubLower = String(notif.target_publication_id).toLowerCase();
      for (const id of this.orderedIds) {
        const candidate = this.byId.get(id);
        if (
          candidate &&
          candidate.type === notif.type &&
          candidate.target_publication_id &&
          String(candidate.target_publication_id).toLowerCase() === targetPubLower
        ) {
          if (!existingMatch) existingMatch = candidate;
          idsToReplace.add(id);
        }
      }
    }

    const wasPending = existingMatch?.status === 'pending';
    for (const oldId of idsToReplace) this.byId.delete(oldId);
    this.byId.set(notif.id, notif);
    this.orderedIds = [notif.id, ...this.orderedIds.filter((id) => !idsToReplace.has(id))];

    if (notif.status !== 'seen' && !wasPending) {
      this.pendingCount += 1;
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
    const matchesUser = (a?: AuthorSnapshot | null) =>
      Boolean(a && (a.id === user.id || a.username?.toLowerCase() === user.username.toLowerCase()));
    const patchActor = (a: AuthorSnapshot): AuthorSnapshot => ({
      ...a, name: user.name, username: user.username, icon_url: user.icon_url, banner_url: user.banner_url, role: user.role,
    });

    for (const [id, n] of this.byId.entries()) {
      const senderMatch = matchesUser(n.sender);
      const actorsMatch = Array.isArray(n.actors) && n.actors.some(matchesUser);
      if (senderMatch || actorsMatch) {
        this.byId.set(id, {
          ...n,
          sender: senderMatch ? patchActor(n.sender) : n.sender,
          ...(Array.isArray(n.actors) ? { actors: n.actors.map((a) => (matchesUser(a) ? patchActor(a) : a)) } : {}),
        });
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
