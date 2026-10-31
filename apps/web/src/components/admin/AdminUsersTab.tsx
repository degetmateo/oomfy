import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Ban, CheckCircle } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { AdminUserSummary } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';

export const AdminUsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ success: boolean; data: AdminUserSummary[] }>({
    queryKey: ['admin-users', search],
    queryFn: () => ApiClient.get(`/admin/users?query=${encodeURIComponent(search.trim())}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      ApiClient.put(`/admin/users/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: Error) => dialog.alert(err.message, 'Error al cambiar estado'),
  });

  const handleToggleStatus = async (user: AdminUserSummary) => {
    const isSuspending = user.status !== 'suspended';
    const confirmed = await dialog.confirm({
      title: isSuspending ? 'Suspender usuario' : 'Reactivar usuario',
      message: `¿Estás seguro de que deseas ${isSuspending ? 'suspender' : 'reactivar'} la cuenta de @${user.username}?`,
      isDanger: isSuspending,
      confirmText: isSuspending ? 'Suspender' : 'Reactivar',
    });
    if (confirmed) {
      statusMutation.mutate({ id: user.id, status: isSuspending ? 'suspended' : 'active' });
    }
  };

  const users = data?.data || [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario, nombre o email..."
          className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
        />
      </div>

      <div className="divide-y divide-dark-border border border-dark-border bg-dark-bg">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Buscando usuarios...</div>
        ) : users.length > 0 ? (
          users.map((u) => (
            <div key={u.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate">{u.name}</span>
                  <span className="text-[11px] text-dark-muted">@{u.username}</span>
                  <PixelBadge role={u.role} />
                  {u.status === 'suspended' && (
                    <span className="px-1 text-[9px] bg-red-500/20 text-red-400 border border-red-500/40">
                      SUSPENDIDO
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-dark-muted truncate mt-0.5">{u.email}</p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleStatus(u)}
                className={`px-2.5 py-1 text-[11px] font-bold border pixel-button flex items-center gap-1 ${
                  u.status === 'suspended'
                    ? 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
                    : 'border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black'
                }`}
              >
                {u.status === 'suspended' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                <span>{u.status === 'suspended' ? 'Reactivar' : 'Suspender'}</span>
              </button>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>
        )}
      </div>
    </div>
  );
};

