import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { AsideUsersCard } from './AsideUsersCard.js';

export const Aside: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: onlineData } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['online-members'],
    queryFn: () => ApiClient.get('/aux/online-members'),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const { data: suggestedData } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['suggested-members'],
    queryFn: () => ApiClient.get('/aux/suggested-members?limit=4'),
    staleTime: 2 * 60 * 1000,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explore?q=${encodeURIComponent(search.trim())}`);
  };

  const onlineMembers = onlineData?.data || [];
  const suggestedMembers = (suggestedData?.data || []).filter((m) => !currentUser || m.id !== currentUser.id);

  return (
    <aside className="w-80 hidden lg:flex flex-col gap-4 p-4 sticky top-0 h-screen border-l border-dark-border font-mono overflow-y-auto">
      {isAuthenticated && (
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en oomfy..."
            className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </form>
      )}

      <AsideUsersCard
        onlineMembers={onlineMembers}
        suggestedMembers={suggestedMembers}
        isAuthenticated={isAuthenticated}
      />

      {!isAuthenticated && (
        <div className="p-3 border border-dark-border bg-dark-card/30 flex flex-col gap-2">
          <h4 className="font-bold text-xs text-white uppercase">¿Nuevo en oomfy?</h4>
          <p className="text-[11px] text-dark-muted">
            Únete para publicar, interactuar y debatir en hilos en tiempo real.
          </p>
          <div className="flex gap-2 mt-1">
            <Link to="/signup" className="flex-1 py-1.5 text-center text-xs font-bold bg-brand-500 text-black uppercase pixel-button">
              Registro
            </Link>
            <Link to="/signin" className="flex-1 py-1.5 text-center text-xs font-bold border border-dark-border text-white hover:bg-dark-card uppercase">
              Entrar
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
};
