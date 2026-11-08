import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { Notification } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { NotificationItem } from '../components/notifications/NotificationItem.js';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const NotificationsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [sessionUnreadIds, setSessionUnreadIds] = useState<Set<string>>(new Set());
  const hasAutoMarkedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = SocketClient.getSocket();
    const handleNotif = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
    };
    socket.on('notification', handleNotif);
    return () => {
      socket.off('notification', handleNotif);
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
    };
  }, [queryClient, isAuthenticated]);

  const { data, isLoading, isError, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<{ success: boolean; data: { notifications: Notification[]; pendingCount: number } }>({
      queryKey: ['notifications-infinite-list'],
      queryFn: ({ pageParam }) => ApiClient.get(`/notifications${pageParam ? `?older_id=${encodeURIComponent(String(pageParam))}&limit=20` : '?limit=20'}`),
      initialPageParam: '' as string,
      getNextPageParam: (lastPage) => {
        const notifs = lastPage?.data?.notifications;
        return Array.isArray(notifs) && notifs.length >= 20 ? notifs[notifs.length - 1]?.id : undefined;
      },
      enabled: isAuthenticated,
    });

  const allNotifications = data?.pages?.flatMap((page) => page?.data?.notifications || []) || [];

  useEffect(() => {
    if (!data?.pages?.length) return;
    const newlyPending = allNotifications.filter((n) => n.status === 'pending').map((n) => n.id);
    if (newlyPending.length > 0) setSessionUnreadIds((prev) => new Set([...prev, ...newlyPending]));
    if (!hasAutoMarkedRef.current && (newlyPending.length > 0 || (data.pages[0]?.data?.pendingCount ?? 0) > 0)) {
      hasAutoMarkedRef.current = true;
      ApiClient.post('/notifications/read').then(() => queryClient.invalidateQueries({ queryKey: ['notifications-summary'] })).catch(() => {});
    }
  }, [data, queryClient]);

  const markAllMutation = useMutation({
    mutationFn: () => ApiClient.post('/notifications/read'),
    onSuccess: () => {
      setSessionUnreadIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
    },
  });

  const loadMoreRef = useInfiniteScroll(() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }, Boolean(hasNextPage));
  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="flex flex-col min-h-screen font-mono">
        <Header title="Notificaciones" onRefresh={() => refetch()}>
          <button onClick={() => markAllMutation.mutate()} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
            <CheckCheck className="w-4 h-4" /><span>Leídas</span>
          </button>
        </Header>
        {isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            <p>No se pudieron cargar las notificaciones.</p>
            <button onClick={() => refetch()} className="mt-3 px-3 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold pixel-button">Reintentar</button>
          </div>
        ) : isLoading ? <div className="p-8 text-center text-xs text-dark-muted">Cargando notificaciones...</div> : allNotifications.length > 0 ? (
          <>
            <div className="divide-y divide-dark-border">
              {allNotifications.map((notif) => (
                <NotificationItem key={notif.id} notif={notif} isUnread={notif.status === 'pending' || sessionUnreadIds.has(notif.id)} />
              ))}
            </div>
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">{isFetchingNextPage && <span>Cargando más notificaciones...</span>}</div>
          </>
        ) : <div className="p-8 text-center text-xs text-dark-muted"><p className="font-semibold text-white">No tienes notificaciones pendientes.</p></div>}
      </div>
    </PullToRefresh>
  );
};
