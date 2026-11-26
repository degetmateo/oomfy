import { AuthorSnapshot, Notification } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';

const PUB_EMBED_TYPES = new Set(['comment', 'quote', 'mention', 'upvote', 'share']);
const GROUPABLE_TYPES = new Set(['upvote', 'share']);
const MAX_GROUPED_ACTORS = 8;
const MAX_PAGINATION_BATCHES = 5;

export class NotificationService {
  public static collapseGroupedNotifications(notifications: Notification[]): Notification[] {
    const result: Notification[] = [];
    const groupedIndex = new Map<string, number>();

    for (const notif of notifications) {
      if (!GROUPABLE_TYPES.has(notif.type) || !notif.target_publication_id) {
        result.push(notif);
        continue;
      }

      const key = `${notif.type}:${String(notif.target_publication_id).toLowerCase()}`;
      const existingIdx = groupedIndex.get(key);
      if (existingIdx === undefined) {
        const initialIds = Array.from(new Set(
          (notif.actor_ids?.length ? notif.actor_ids : [notif.sender?.id]).filter(Boolean).map(String)
        ));
        const initialActors = (notif.actors?.length ? notif.actors : (notif.sender ? [notif.sender] : [])).slice(0, MAX_GROUPED_ACTORS);
        const count = Math.max(1, notif.actors_count || initialIds.length || initialActors.length || 1);
        result.push({
          ...notif,
          ...(initialIds.length ? { actor_ids: initialIds } : {}),
          ...(initialActors.length ? { actors: initialActors } : {}),
          actors_count: count,
        });
        groupedIndex.set(key, result.length - 1);
        continue;
      }

      const current = result[existingIdx];
      const mergedIds: string[] = [];
      const seenIds = new Set<string>();
      for (const id of [
        ...(current.actor_ids || (current.sender?.id ? [current.sender.id] : [])),
        ...(notif.actor_ids || (notif.sender?.id ? [notif.sender.id] : [])),
      ]) {
        const idStr = String(id || '');
        if (!idStr) continue;
        const lower = idStr.toLowerCase();
        if (!seenIds.has(lower)) {
          seenIds.add(lower);
          mergedIds.push(idStr);
        }
      }

      const mergedActors: AuthorSnapshot[] = [];
      const seenActors = new Set<string>();
      for (const actor of [
        ...(current.actors || (current.sender ? [current.sender] : [])),
        ...(notif.actors || (notif.sender ? [notif.sender] : [])),
      ]) {
        if (!actor?.id) continue;
        const lower = String(actor.id).toLowerCase();
        if (!seenActors.has(lower)) {
          seenActors.add(lower);
          mergedActors.push(actor);
        }
        if (mergedActors.length >= MAX_GROUPED_ACTORS) break;
      }

      const totalCount = Math.max(
        mergedIds.length,
        (current.actors_count || 1) + (notif.actors_count || 1) - (seenIds.size < (current.actor_ids?.length || 1) + (notif.actor_ids?.length || 1) ? 1 : 0)
      );

      result[existingIdx] = {
        ...current,
        actor_ids: mergedIds,
        actors: mergedActors,
        actors_count: Math.max(mergedIds.length, totalCount),
        status: current.status === 'pending' || notif.status === 'pending' ? 'pending' : 'seen',
      };
    }

    return result;
  }

  public static async populateTargetPublications(notifications: Notification[], userId: string): Promise<Notification[]> {
    const targetIds = Array.from(new Set(
      notifications
        .filter((n) => n.target_publication_id && PUB_EMBED_TYPES.has(n.type))
        .map((n) => String(n.target_publication_id))
    ));
    if (targetIds.length > 0) {
      const pubs = await MongoPublicationRepository.findManyByIds(targetIds, userId);
      const pubMap = new Map(pubs.map((p) => [p.id.toLowerCase(), p]));
      for (const n of notifications) {
        if (n.target_publication_id && PUB_EMBED_TYPES.has(n.type)) {
          n.target_publication = pubMap.get(String(n.target_publication_id).toLowerCase()) || null;
        }
      }
    }
    return notifications;
  }

  public static async getNotifications(
    userId: string,
    limit: number = 20,
    olderId?: string | null
  ): Promise<{
    notifications: Notification[];
    pendingCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const pageSize = Math.min(Math.max(1, limit || 20), 50);
    const rawAccumulated: Notification[] = [];
    let collapsed: Notification[] = [];
    let cursor: string | null = olderId || null;
    let hasMore = false;

    for (let batchIdx = 0; batchIdx < MAX_PAGINATION_BATCHES; batchIdx++) {
      const batch = await MongoNotificationRepository.listByRecipient(userId, pageSize + 1, cursor);
      const batchHasMore = batch.length > pageSize;
      const slice = batchHasMore ? batch.slice(0, pageSize) : batch;
      if (slice.length === 0) {
        hasMore = false;
        break;
      }

      rawAccumulated.push(...slice);
      collapsed = this.collapseGroupedNotifications(rawAccumulated);
      cursor = slice[slice.length - 1]?.id || null;
      hasMore = batchHasMore;

      if (collapsed.length >= pageSize || !batchHasMore || !cursor) {
        break;
      }
    }

    await this.populateTargetPublications(collapsed, userId);
    const pendingCount = await MongoNotificationRepository.countPending(userId);
    return {
      notifications: collapsed,
      pendingCount,
      hasMore,
      nextCursor: hasMore ? cursor : null,
    };
  }

  public static async getPendingCount(userId: string): Promise<number> {
    return MongoNotificationRepository.countPending(userId);
  }

  public static async markAllAsRead(userId: string): Promise<{ message: string }> {
    await MongoNotificationRepository.markAllAsSeen(userId);
    return { message: 'Notificaciones marcadas como leídas.' };
  }
}
