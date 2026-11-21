import { QueryClient } from '@tanstack/react-query';
import { Notification } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';

interface NotificationPageResponse {
  success: boolean;
  data: { notifications: Notification[]; pendingCount: number };
}

export class NotificationController {
  public static getNextPageParam(lastPage?: NotificationPageResponse): string | undefined {
    const notifs = lastPage?.data?.notifications;
    return Array.isArray(notifs) && notifs.length >= 20 ? notifs[notifs.length - 1]?.id : undefined;
  }

  public static getPlaceholderData() {
    const list = notificationIdentityMap.getNotifications();
    if (list.length === 0) return undefined;
    return {
      pages: [{ success: true, data: { notifications: list, pendingCount: notificationIdentityMap.getPendingCount() } }],
      pageParams: [''],
    };
  }

  public static async fetchPage(pageParam?: string): Promise<NotificationPageResponse> {
    const query = pageParam ? `?older_id=${encodeURIComponent(pageParam)}&limit=20` : '?limit=20';
    const res = await ApiClient.get<NotificationPageResponse>(`/notifications${query}`);
    const list = res?.data?.notifications || [];
    const pending = res?.data?.pendingCount;
    notificationIdentityMap.ingestPage(list, pageParam ? undefined : pending, Boolean(pageParam));
    return res;
  }

  public static async fetchPendingCount(): Promise<{ success: boolean; count: number }> {
    const res = await ApiClient.get<{ success: boolean; count: number }>('/notifications/unread-count');
    if (typeof res?.count === 'number') notificationIdentityMap.setPendingCount(res.count);
    return res;
  }

  public static receiveRealtimeNotification(notif: Notification, queryClient: QueryClient): void {
    if (!notif?.id) return;
    const cachedUnread = (queryClient.getQueryData(['notifications-unread-count']) as { count?: number } | undefined)?.count;
    if (typeof cachedUnread === 'number' && cachedUnread > notificationIdentityMap.getPendingCount()) {
      notificationIdentityMap.setPendingCount(cachedUnread);
    }
    notificationIdentityMap.prependRealtime(notif);
    const nextCount = notificationIdentityMap.getPendingCount();
    queryClient.setQueryData(['notifications-unread-count'], { success: true, count: nextCount });
    let updatedList = false;
    queryClient.setQueryData(['notifications-infinite-list'], (old: any) => {
      if (!old?.pages?.length) return old;
      const firstPage = old.pages[0];
      const existing: Notification[] = firstPage?.data?.notifications || [];
      if (existing.some((n) => n.id === notif.id)) {
        updatedList = true;
        return old;
      }
      updatedList = true;
      return {
        ...old,
        pages: [{ ...firstPage, data: { ...firstPage.data, notifications: [notif, ...existing] } }, ...old.pages.slice(1)],
      };
    });
    if (!updatedList) queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
  }

  public static async markAllAsRead(queryClient: QueryClient): Promise<void> {
    notificationIdentityMap.markAllSeen();
    queryClient.setQueryData(['notifications-unread-count'], { success: true, count: 0 });
    queryClient.setQueryData(['notifications-infinite-list'], (old: any) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: page?.data ? {
            ...page.data,
            pendingCount: 0,
            notifications: Array.isArray(page.data.notifications)
              ? page.data.notifications.map((n: Notification) => (n.status === 'seen' ? n : { ...n, status: 'seen' }))
              : page.data.notifications,
          } : page?.data,
        })),
      };
    });
    await ApiClient.post('/notifications/read');
  }
}
