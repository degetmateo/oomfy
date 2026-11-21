import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { Notification } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { NotificationItem } from '../components/notifications/NotificationItem.js';
import { useAuthStore } from '../stores/authStore.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { NotificationController } from '../controllers/NotificationController.js';
import { useNotificationModel } from '../hooks/useNotificationModel.js';

export const NotificationsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { notifications: modelNotifications } = useNotificationModel();
  const [sessionUnreadIds, setSessionUnreadIds] = useState<Set<string>>(new Set());
  const hasAutoMarkedRef = useRef(false);

  const { data, isLoading, isError, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<{ success: boolean; data: { notifications: Notification[]; pendingCount: number } }>({
      queryKey: ['notifications-infinite-list'],
      queryFn: ({ pageParam }) => NotificationController.fetchPage(pageParam ? String(pageParam) : undefined),
      initialPageParam: '' as string,
      getNextPageParam: NotificationController.getNextPageParam,
      placeholderData: () => NotificationController.getPlaceholderData(),
      retry: 2,
      retryOnMount: true,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: isAuthenticated,
    });

  const queryNotifications = data?.pages?.flatMap((page) => page?.data?.notifications || []) || [];
  const allNotifications = modelNotifications.length > 0 ? modelNotifications : queryNotifications;
  const recoveredErrorRef = useRef(false);

  useEffect(() => {
    if (!recoveredErrorRef.current && isAuthenticated && isError) {
      recoveredErrorRef.current = true;
      refetch();
    }
  }, [isAuthenticated, isError, refetch]);

  useEffect(() => {
    if (!data?.pages?.length) return;
    const newlyPending = allNotifications.filter((n) => n.status === 'pending').map((n) => n.id);
    if (newlyPending.length > 0) setSessionUnreadIds((prev) => new Set([...prev, ...newlyPending]));
    if (!hasAutoMarkedRef.current && (newlyPending.length > 0 || (data.pages[0]?.data?.pendingCount ?? 0) > 0)) {
      hasAutoMarkedRef.current = true;
      NotificationController.markAllAsRead(queryClient).catch(() => {});
    }
  }, [data, queryClient]);

  const markAllMutation = useMutation({
    mutationFn: () => NotificationController.markAllAsRead(queryClient),
    onSuccess: () => {
      setSessionUnreadIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
    },
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="flex flex-col min-h-screen font-mono">
        <Header title="Notificaciones" onRefresh={() => refetch()}>
          <button onClick={() => markAllMutation.mutate()} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
            <CheckCheck className="w-4 h-4" /><span>Leídas</span>
          </button>
        </Header>
        {isError && allNotifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-red-400">
            <p>No se pudieron cargar las notificaciones.</p>
            <button onClick={() => refetch()} className="mt-3 px-3 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold pixel-button">Reintentar</button>
          </div>
        ) : isLoading && allNotifications.length === 0 ? <div className="p-8 text-center text-xs text-dark-muted">Cargando notificaciones...</div> : allNotifications.length > 0 ? (
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
