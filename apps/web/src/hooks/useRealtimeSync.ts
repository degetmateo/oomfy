import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';
import { NotificationController } from '../controllers/NotificationController.js';
import { PublicationController } from '../controllers/PublicationController.js';

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { isAuthenticated, user, token } = useAuthStore();
  const userId = user?.id;
  const wasAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      useEntityRegistryStore.getState().clearRegistry();
      notificationIdentityMap.clear();
      if (wasAuthRef.current) queryClient.clear();
      wasAuthRef.current = false;
      return;
    }
    wasAuthRef.current = true;

    const socket = SocketClient.getSocket(token || undefined);
    const syncBadgesAndLists = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const onNotification = (notif: any) => NotificationController.receiveRealtimeNotification(notif, queryClient);
    const onInteraction = (data: any) => PublicationController.applyRealtimeInteraction(data, queryClient);

    const onChatMessage = (msg: any) => {
      if (msg?.sender_id === userId) return;
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncBadgesAndLists();
    };

    socket.on('notification', onNotification);
    socket.on('publication-interaction-updated', onInteraction);
    socket.on('new_chat_message', onChatMessage);
    socket.on('connect', syncBadgesAndLists);
    window.addEventListener('focus', syncBadgesAndLists);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      socket.off('notification', onNotification);
      socket.off('publication-interaction-updated', onInteraction);
      socket.off('new_chat_message', onChatMessage);
      socket.off('connect', syncBadgesAndLists);
      window.removeEventListener('focus', syncBadgesAndLists);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, userId, token, queryClient]);
}
