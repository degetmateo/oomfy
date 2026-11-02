import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, UserPlus, Repeat, MessageSquare, Quote, CheckCheck } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { Notification } from '@oomfy/shared';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const NotificationsView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

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
    };
  }, [queryClient, isAuthenticated]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<{ success: boolean; data: { notifications: Notification[]; pendingCount: number } }>({
    queryKey: ['notifications-infinite-list'],
    queryFn: ({ pageParam }) => {
      const p = pageParam ? `?older_id=${encodeURIComponent(String(pageParam))}&limit=20` : '?limit=20';
      return ApiClient.get(`/notifications${p}`);
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => {
      const notifs = lastPage?.data?.notifications;
      if (!Array.isArray(notifs) || notifs.length < 20) return undefined;
      return notifs[notifs.length - 1]?.id;
    },
    enabled: isAuthenticated,
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, Boolean(hasNextPage));

  const markAllMutation = useMutation({
    mutationFn: () => ApiClient.post('/notifications/read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-infinite-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const allNotifications = data?.pages?.flatMap((page) => page?.data?.notifications || []) || [];

  const handleNotificationClick = (notif: Notification) => {
    if (notif.target_publication_id) {
      navigate(`/publication/${notif.target_publication_id}`);
    } else {
      navigate(`/${notif.sender.username}`);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'upvote':
        return <Heart className="w-5 h-5 text-red-500 fill-current mt-0.5 flex-shrink-0" />;
      case 'share':
        return <Repeat className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />;
      case 'quote':
        return <Quote className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Notificaciones">
        <button
          onClick={() => markAllMutation.mutate()}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Leídas</span>
        </button>
      </Header>

      {isError ? (
        <div className="p-8 text-center text-xs text-red-400">
          <p>No se pudieron cargar las notificaciones.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-3 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold pixel-button"
          >
            Reintentar
          </button>
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando notificaciones...</div>
      ) : allNotifications.length > 0 ? (
        <>
          <div className="divide-y divide-dark-border">
            {allNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 hover:bg-dark-card/40 transition-colors flex gap-3.5 items-start cursor-pointer ${notif.status === 'pending' ? 'bg-brand-500/5' : ''
                  }`}
              >
                {renderIcon(notif.type)}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <PixelAvatar
                    src={notif.sender.icon_url}
                    username={notif.sender.username}
                    sizeClass="w-9 h-9"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white">
                      <span className="font-bold hover:underline">@{notif.sender.username}</span>{' '}
                      <span className="text-dark-text">
                        {notif.type === 'upvote' && 'le dio me gusta a tu publicación.'}
                        {notif.type === 'share' && 'compartió tu publicación.'}
                        {notif.type === 'comment' && 'respondió a tu publicación.'}
                        {notif.type === 'quote' && 'citó tu publicación.'}
                        {notif.type === 'follow' && 'comenzó a seguirte.'}
                      </span>
                    </p>
                    <span className="text-[10px] text-dark-muted mt-1 block">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
            {isFetchingNextPage && <span>Cargando más notificaciones...</span>}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted">
          <p className="font-semibold text-white">No tienes notificaciones pendientes.</p>
        </div>
      )}
    </div>
  );
};

