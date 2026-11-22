import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClientSyncPayload } from '@oomfy/shared';
import { SocketClient } from '../services/socket.js';
import { ApiClient } from '../services/api.js';
import { getAccessToken } from '../services/sessionTokenMemory.js';
import { useAuthStore } from '../stores/authStore.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { NotificationController } from '../controllers/NotificationController.js';
import { PublicationController } from '../controllers/PublicationController.js';

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { isAuthenticated, user, token } = useAuthStore();
  const userId = user?.id;
  const wasAuthRef = useRef(isAuthenticated);
  const lastSyncAtRef = useRef(0);
  const lastReturnAtRef = useRef(0);
  const wasAwayRef = useRef(false);
  const leftAtRef = useRef(0);

  useEffect(() => {
    if (isAuthenticated && token) SocketClient.getSocket(token);
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      wasAwayRef.current = false;
      leftAtRef.current = 0;
      useEntityRegistryStore.getState().clearRegistry();
      notificationIdentityMap.clear();
      if (wasAuthRef.current) queryClient.clear();
      wasAuthRef.current = false;
      return;
    }
    wasAuthRef.current = true;

    const socket = SocketClient.getSocket(useAuthStore.getState().token || undefined);
    const syncBadgesAndLists = () => {
      const now = Date.now();
      if (now - lastSyncAtRef.current < 1500) return;
      lastSyncAtRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const emitLeave = () => {
      if (wasAwayRef.current) return;
      wasAwayRef.current = true;
      leftAtRef.current = Date.now();
      socket.emit('client:leave', {
        activeChatId: SocketClient.getActiveChatId?.() ?? null,
        timestamp: leftAtRef.current,
      });
    };

    const sendReturn = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastReturnAtRef.current < 1000) return;
      lastReturnAtRef.current = now;
      const payload = {
        since: leftAtRef.current || null,
        activeChatId: SocketClient.getActiveChatId?.() ?? null,
        chatIds: SocketClient.getTrackedChatIds?.() ?? [],
      };
      const emitNow = () => socket.emit('client:return', payload);
      if ((socket as any).connected === false) {
        if (!getAccessToken()) {
          const refreshed = await ApiClient.refreshAccessToken().catch(() => null);
          if (refreshed) SocketClient.getSocket(refreshed);
        }
        if (typeof (socket as any).once === 'function') (socket as any).once('connect', emitNow);
        (socket as any).connect?.();
        return;
      }
      emitNow();
    };

    const onClientSync = (data: ClientSyncPayload) => {
      if (!data || typeof data !== 'object') return;
      const missedNotifs = Array.isArray(data.missed_notifications) ? data.missed_notifications : [];
      if (missedNotifs.length > 0) {
        notificationIdentityMap.ingestPage(missedNotifs, data.unread_notifications_count, false);
        queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      } else if (typeof data.unread_notifications_count === 'number') {
        notificationIdentityMap.setPendingCount(data.unread_notifications_count);
      }
      if (typeof data.unread_notifications_count === 'number') {
        queryClient.setQueryData(['notifications-unread-count'], { success: true, count: Math.max(0, data.unread_notifications_count) });
      }
      if (typeof data.unread_messages_count === 'number') {
        queryClient.setQueryData(['unread-messages-count'], { success: true, count: Math.max(0, data.unread_messages_count) });
      }
      const activeCid = SocketClient.getActiveChatId?.()?.toLowerCase();
      let addedToActive = false;
      for (const [cid, msgs] of Object.entries(data.missed_messages || {})) {
        if (!Array.isArray(msgs) || msgs.length === 0) continue;
        for (const m of msgs) chatIdentityMap.upsertMessage(cid, m);
        if (activeCid && cid.toLowerCase() === activeCid) addedToActive = true;
      }
      if (addedToActive && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oomfy:client-sync', { detail: { chatId: activeCid, serverTime: data.serverTime } }));
      }
      if (Object.keys(data.missed_messages || {}).length > 0) queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const onNotification = (notif: any) => NotificationController.receiveRealtimeNotification(notif, queryClient);
    const onInteraction = (data: any) => PublicationController.applyRealtimeInteraction(data, queryClient);
    const onChatMessage = (msg: any) => {
      if (msg?.sender_id === userId) return;
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') emitLeave();
      else if (document.visibilityState === 'visible') {
        const wasAway = wasAwayRef.current;
        wasAwayRef.current = false;
        syncBadgesAndLists();
        if (wasAway) void sendReturn(false);
      }
    };
    const onPageHide = () => emitLeave();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted || wasAwayRef.current) {
        wasAwayRef.current = false;
        syncBadgesAndLists();
        void sendReturn(false);
      }
    };
    const onOnline = () => {
      wasAwayRef.current = false;
      syncBadgesAndLists();
      void sendReturn(true);
    };

    socket.on('notification', onNotification);
    socket.on('publication-interaction-updated', onInteraction);
    socket.on('new_chat_message', onChatMessage);
    socket.on('client:sync', onClientSync);
    socket.on('connect', syncBadgesAndLists);
    window.addEventListener('focus', syncBadgesAndLists);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    return () => {
      socket.off('notification', onNotification);
      socket.off('publication-interaction-updated', onInteraction);
      socket.off('new_chat_message', onChatMessage);
      socket.off('client:sync', onClientSync);
      socket.off('connect', syncBadgesAndLists);
      window.removeEventListener('focus', syncBadgesAndLists);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, [isAuthenticated, userId, queryClient]);
}
