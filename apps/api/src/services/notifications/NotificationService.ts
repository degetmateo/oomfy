import { Notification } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';

const PUB_EMBED_TYPES = new Set(['comment', 'quote', 'mention', 'upvote', 'share']);

export class NotificationService {
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
  }> {
    const notifications = await MongoNotificationRepository.listByRecipient(userId, limit, olderId);
    await this.populateTargetPublications(notifications, userId);
    const pendingCount = await MongoNotificationRepository.countPending(userId);
    return { notifications, pendingCount };
  }

  public static async getPendingCount(userId: string): Promise<number> {
    return MongoNotificationRepository.countPending(userId);
  }

  public static async markAllAsRead(userId: string): Promise<{ message: string }> {
    await MongoNotificationRepository.markAllAsSeen(userId);
    return { message: 'Notificaciones marcadas como leídas.' };
  }
}

