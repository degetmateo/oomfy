import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { AdminUserSummary } from '@oomfy/shared';
import { AdminUserRow } from './AdminUserRow.js';

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

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => ApiClient.post(`/admin/users/${userId}/revoke-sessions`),
    onSuccess: () => dialog.alert('Se han cerrado las sesiones activas del usuario.', 'Sesiones revocadas'),
    onError: (err: Error) => dialog.alert(err.message, 'Error al cerrar sesiones'),
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

  const handleRevokeSessions = async (user: AdminUserSummary) => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar sesiones de usuario',
      message: `¿Estás seguro de que deseas cerrar todas las sesiones activas de @${user.username}?`,
      isDanger: true,
      confirmText: 'Cerrar sesiones',
    });
    if (confirmed) {
      revokeMutation.mutate(user.id);
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
            <AdminUserRow
              key={u.id}
              user={u}
              onToggleStatus={handleToggleStatus}
              onRevokeSessions={handleRevokeSessions}
            />
          ))
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>
        )}
      </div>
    </div>
  );
};
