import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Header } from '../components/layout/Header.js';
import { UserSearchCard } from '../components/profile/UserSearchCard.js';
import { ApiClient } from '../services/api.js';
import { PublicUser } from '@oomfy/shared';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const FollowListView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isFollowersRoute = location.pathname.endsWith('/followers');
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    isFollowersRoute ? 'followers' : 'following'
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['user-follows', username, activeTab],
    queryFn: ({ pageParam }: { pageParam: any }) => {
      const p = new URLSearchParams();
      p.append('limit', '20');
      if (pageParam) p.append('older_id', String(pageParam));
      return ApiClient.get(`/follows/${username}/${activeTab}?${p.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const users = lastPage?.data || [];
      return users.length >= 20 ? users[users.length - 1]?.id : undefined;
    },
    enabled: Boolean(username),
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, Boolean(hasNextPage));

  const allUsers = (data?.pages.flatMap((page) => page.data) || []).filter(
    (user, index, self) => index === self.findIndex((u) => u.id === user.id)
  );

  const handleTabChange = (tab: 'followers' | 'following') => {
    setActiveTab(tab);
    navigate(`/${username}/${tab}`, { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header
        title={activeTab === 'followers' ? 'Seguidores' : 'Siguiendo'}
        subtitle={`@${username}`}
      />

      <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60">
        <button
          onClick={() => handleTabChange('followers')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${
            activeTab === 'followers'
              ? 'text-brand-400 border-b-2 border-brand-400'
              : 'text-dark-muted hover:text-white border-b-2 border-transparent'
          }`}
        >
          Seguidores
        </button>
        <button
          onClick={() => handleTabChange('following')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${
            activeTab === 'following'
              ? 'text-brand-400 border-b-2 border-brand-400'
              : 'text-dark-muted hover:text-white border-b-2 border-transparent'
          }`}
        >
          Siguiendo
        </button>
      </div>

      <div className="divide-y divide-dark-border flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Cargando usuarios...</div>
        ) : allUsers.length > 0 ? (
          <>
            {allUsers.map((u) => (
              <UserSearchCard key={u.id} user={u} />
            ))}
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
              {isFetchingNextPage && <span>Cargando más usuarios...</span>}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">
            {activeTab === 'followers'
              ? 'No tiene seguidores todavía.'
              : 'No sigue a nadie todavía.'}
          </div>
        )}
      </div>
    </div>
  );
};

