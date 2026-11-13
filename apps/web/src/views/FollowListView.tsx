import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { UserSearchCard } from '../components/profile/UserSearchCard.js';
import { ApiClient } from '../services/api.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';

const FOLLOW_TABS = ['followers', 'following'] as const;

export const FollowListView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: 'followers' | 'following' = location.pathname.endsWith('/followers') ? 'followers' : 'following';
  const { touchHandlers } = useTabSwipe({
    tabs: FOLLOW_TABS,
    activeTab,
    onTabChange: (tab) => navigate(`/${username}/${tab}`, { replace: true }),
  });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['user-follows', username, activeTab],
    queryFn: ({ pageParam = 0 }) => ApiClient.get(`/follows/${username}/${activeTab}?limit=20&offset=${String(pageParam)}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage?.data?.length >= 20 ? allPages.length * 20 : undefined),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(username),
  });

  const loadMoreRef = useInfiniteScroll(() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }, Boolean(hasNextPage));
  const allUsers = (data?.pages.flatMap((p) => p.data) || []).filter((u, idx, arr) => idx === arr.findIndex((x) => x.id === u.id));

  return (
    <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
      <Header title={activeTab === 'followers' ? 'Seguidores' : 'Siguiendo'} subtitle={`@${username}`} />
      <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60">
        {(['followers', 'following'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => navigate(`/${username}/${tab}`, { replace: true })}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors border-b-2 ${activeTab === tab ? 'text-brand-400 border-brand-400' : 'text-dark-muted hover:text-white border-transparent'}`}
          >
            {tab === 'followers' ? 'Seguidores' : 'Siguiendo'}
          </button>
        ))}
      </div>
      <div className="divide-y divide-dark-border flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Cargando usuarios...</div>
        ) : allUsers.length > 0 ? (
          <>
            {allUsers.map((u) => <UserSearchCard key={u.id} user={u} />)}
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">{isFetchingNextPage && <span>Cargando más usuarios...</span>}</div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">{activeTab === 'followers' ? 'No tiene seguidores todavía.' : 'No sigue a nadie todavía.'}</div>
        )}
      </div>
    </div>
  );
};
