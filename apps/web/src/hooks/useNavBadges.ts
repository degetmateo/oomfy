import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { NotificationController } from '../controllers/NotificationController.js';
import { useNotificationModel } from './useNotificationModel.js';

export function useNavBadges() {
  const { user, isAuthenticated } = useAuthStore();
  const { pendingCount } = useNotificationModel();
  const enabled = Boolean(isAuthenticated && user);

  const { data: notifData } = useQuery<{ success: boolean; count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: () => NotificationController.fetchPendingCount(),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const { data: chatData } = useQuery<{ success: boolean; count: number }>({
    queryKey: ['unread-messages-count'],
    queryFn: () => ApiClient.get('/chats/unread-count'),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  return {
    pendingNotifs: pendingCount || notifData?.count || 0,
    unreadMessages: chatData?.count || 0,
  };
}
