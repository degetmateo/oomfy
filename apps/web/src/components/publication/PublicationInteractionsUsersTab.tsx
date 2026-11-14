import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { UserSearchCard } from '../profile/UserSearchCard.js';
import { ApiClient } from '../../services/api.js';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll.js';

interface Props {
  publicationId: string;
  type: 'shares' | 'likes';
}

export const PublicationInteractionsUsersTab: React.FC<Props> = ({ publicationId, type }) => {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['publication-interactions-users', publicationId, type],
    queryFn: ({ pageParam = 0 }) =>
      ApiClient.get(`/publications/${publicationId}/interactions/${type}?limit=20&offset=${String(pageParam)}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage?.data?.length >= 20 ? allPages.length * 20 : undefined),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(publicationId),
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  const allUsers = (data?.pages.flatMap((p) => p.data) || []).filter(
    (u, idx, arr) => idx === arr.findIndex((x) => x.id === u.id)
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-dark-muted font-mono">
        {type === 'shares' ? 'Cargando usuarios que compartieron...' : 'Cargando usuarios a los que les gustó...'}
      </div>
    );
  }

  if (allUsers.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-dark-muted font-mono">
        {type === 'shares' ? 'Nadie compartió esta publicación todavía.' : 'No hay me gusta todavía.'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-dark-border font-mono">
      {allUsers.map((user) => (
        <UserSearchCard key={user.id} user={user} />
      ))}
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más usuarios...</span>}
      </div>
    </div>
  );
};

