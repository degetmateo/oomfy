import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const userId = user?.id;
  const wasAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      useEntityRegistryStore.getState().clearRegistry();
      if (wasAuthRef.current) queryClient.clear();
      wasAuthRef.current = false;
      return;
    }
    wasAuthRef.current = true;

    const socket = SocketClient.getSocket();
    const onNotification = (notif: any) => {
      queryClient.setQueryData(['notifications-unread-count'], (old: any) =>
        old ? { ...old, count: (old.count || 0) + 1 } : { success: true, count: 1 }
      );
      queryClient.setQueryData(['notifications-infinite-list'], (old: any) => {
        if (!old?.pages?.length || !notif?.id) return old;
        const firstPage = old.pages[0];
        const existing = firstPage?.data?.notifications || [];
        if (existing.some((n: any) => n.id === notif.id)) return old;
        return {
          ...old,
          pages: [
            { ...firstPage, data: { ...firstPage.data, notifications: [notif, ...existing] } },
            ...old.pages.slice(1),
          ],
        };
      });
    };

    const onChatMessage = (msg: any) => {
      if (msg?.sender_id === userId) return;
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };

    socket.on('notification', onNotification);
    socket.on('new_chat_message', onChatMessage);
    return () => {
      socket.off('notification', onNotification);
      socket.off('new_chat_message', onChatMessage);
    };
  }, [isAuthenticated, userId, queryClient]);
}
