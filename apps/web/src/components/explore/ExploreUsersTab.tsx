import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { UserSearchCard } from '../profile/UserSearchCard.js';

interface Props {
  searchTerm: string;
}

export const ExploreUsersTab: React.FC<Props> = ({ searchTerm }) => {
  const { data, isLoading } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['explore-users', searchTerm],
    queryFn: () => ApiClient.get(`/aux/search-users?q=${encodeURIComponent(searchTerm)}`),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="p-8 text-center text-xs text-dark-muted">Buscando usuarios...</div>;
  if (!data?.data?.length) return <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>;

  return (
    <>
      {data.data.map((u) => <UserSearchCard key={u.id} user={u} />)}
    </>
  );
};

