import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { PublicUser } from '@oomfy/shared';

export const Aside: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const dialog = useDialogStore();
  const [search, setSearch] = useState('');

  const { data: onlineData } = useQuery<{ success: boolean; data: PublicUser[]; isOnline?: boolean }>({
    queryKey: ['online-members'],
    queryFn: () => ApiClient.get('/aux/online-members'),
    refetchInterval: 15000,
  });

  const { data: suggestedData } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['suggested-members'],
    queryFn: () => ApiClient.get('/aux/suggested-members?limit=4'),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/explore?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent, m: PublicUser) => {
    e.stopPropagation();
    try {
      if (m.is_following) {
        await ApiClient.delete(`/follows/${m.username}`);
      } else {
        await ApiClient.post(`/follows/${m.username}`);
        dialog.alert(`Ahora sigues a @${m.username}`, 'Comunidad');
      }
      queryClient.invalidateQueries({ queryKey: ['suggested-members'] });
      queryClient.invalidateQueries({ queryKey: ['online-members'] });
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al seguir');
    }
  };

  const onlineMembers = onlineData?.data || [];
  const suggestedMembers = (suggestedData?.data || []).filter(
    (m) => !currentUser || m.id !== currentUser.id
  );

  return (
    <aside className="w-80 hidden lg:flex flex-col gap-4 p-4 sticky top-0 h-screen border-l border-dark-border font-mono overflow-y-auto">
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

      <div className="p-3 border border-dark-border bg-dark-card/50">
        <h3 className="font-bold text-xs uppercase tracking-wider text-brand-400 mb-3 flex items-center justify-between">
          <span>Miembros en línea</span>
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        </h3>
        <div className="flex flex-col gap-2.5">
          {onlineMembers.length > 0 ? (
            onlineMembers.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                to={`/${m.username}`}
                className="flex items-center gap-2.5 hover:bg-dark-card p-1 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <PixelAvatar
                    src={m.icon_url}
                    username={m.username}
                    sizeClass="w-9 h-9"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-500 rounded-full border border-black" />
                </div>
                <div className="truncate text-xs">
                  <p className="font-bold text-white hover:text-brand-400 truncate">{m.name}</p>
                  <p className="text-dark-muted text-[10px] truncate">@{m.username}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-[11px] text-dark-muted">No hay miembros conectados ahora.</p>
          )}
        </div>
      </div>

      <div className="p-3 border border-dark-border bg-dark-card/50">
        <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-3">A quién seguir</h3>
        <div className="flex flex-col gap-3">
          {suggestedMembers.slice(0, 4).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <Link to={`/${m.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex-shrink-0">
                  <PixelAvatar
                    src={m.icon_url}
                    username={m.username}
                    sizeClass="w-10 h-10"
                  />
                </div>
                <div className="truncate text-xs">
                  <p className="font-bold text-white hover:text-brand-400 truncate">{m.name}</p>
                  <p className="text-dark-muted text-[10px] truncate">@{m.username}</p>
                </div>
              </Link>
              {isAuthenticated && (
                <button
                  onClick={(e) => handleFollowToggle(e, m)}
                  className={`px-2.5 py-1 text-[11px] font-bold border transition-colors pixel-button flex-shrink-0 ${
                    m.is_following
                      ? 'border-dark-border text-white bg-dark-card hover:border-red-500 hover:text-red-400'
                      : 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
                  }`}
                >
                  {m.is_following ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="p-3 border border-dark-border bg-dark-card/30 flex flex-col gap-2">
          <h4 className="font-bold text-xs text-white uppercase">¿Nuevo en oomfy?</h4>
          <p className="text-[11px] text-dark-muted">
            Únete para publicar, interactuar y debatir en hilos en tiempo real.
          </p>
          <div className="flex gap-2 mt-1">
            <Link
              to="/signup"
              className="flex-1 py-1.5 text-center text-xs font-bold bg-brand-500 text-black uppercase pixel-button"
            >
              Registro
            </Link>
            <Link
              to="/signin"
              className="flex-1 py-1.5 text-center text-xs font-bold border border-dark-border text-white hover:bg-dark-card uppercase"
            >
              Entrar
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
};
