import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';

export function useNavBadges() {
  const { user, isAuthenticated } = useAuthStore();
  const enabled = Boolean(isAuthenticated && user);

  const { data: notifData } = useQuery<{ success: boolean; count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: () => ApiClient.get('/notifications/unread-count'),
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
    pendingNotifs: notifData?.count || 0,
    unreadMessages: chatData?.count || 0,
  };
}

