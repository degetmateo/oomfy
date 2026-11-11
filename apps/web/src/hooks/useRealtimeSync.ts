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
    const syncBadgesAndLists = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const onNotification = (notif: any) => {
      queryClient.setQueryData(['notifications-unread-count'], (old: any) =>
        old ? { ...old, count: (old.count || 0) + 1 } : { success: true, count: 1 }
      );
      let updatedList = false;
      queryClient.setQueryData(['notifications-infinite-list'], (old: any) => {
        if (!old?.pages?.length || !notif?.id) return old;
        const firstPage = old.pages[0];
        const existing = firstPage?.data?.notifications || [];
        if (existing.some((n: any) => n.id === notif.id)) {
          updatedList = true;
          return old;
        }
        updatedList = true;
        return {
          ...old,
          pages: [
            { ...firstPage, data: { ...firstPage.data, notifications: [notif, ...existing] } },
            ...old.pages.slice(1),
          ],
        };
      });
      if (!updatedList) {
        queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      }
    };

    const onChatMessage = (msg: any) => {
      if (msg?.sender_id === userId) return;
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncBadgesAndLists();
    };

    socket.on('notification', onNotification);
    socket.on('new_chat_message', onChatMessage);
    socket.on('connect', syncBadgesAndLists);
    window.addEventListener('focus', syncBadgesAndLists);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      socket.off('notification', onNotification);
      socket.off('new_chat_message', onChatMessage);
      socket.off('connect', syncBadgesAndLists);
      window.removeEventListener('focus', syncBadgesAndLists);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, userId, queryClient]);
}
