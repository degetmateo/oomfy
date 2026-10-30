import { Notification } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';

export class NotificationService {
  public static async getNotifications(
    userId: string,
    limit: number = 20,
    olderId?: string | null
  ): Promise<{
    notifications: Notification[];
    pendingCount: number;
  }> {
    const notifications = await MongoNotificationRepository.listByRecipient(userId, limit, olderId);
    const pendingCount = await MongoNotificationRepository.countPending(userId);
    return { notifications, pendingCount };
  }

  public static async markAllAsRead(userId: string): Promise<{ message: string }> {
    await MongoNotificationRepository.markAllAsSeen(userId);
    return { message: 'Notificaciones marcadas como leídas.' };
  }
}

