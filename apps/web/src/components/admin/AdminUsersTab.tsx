import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { AdminUserSummary, Role } from '@oomfy/shared';
import { AdminUserRow } from './AdminUserRow.js';
import { AdminUserFiltersBar, AdminFiltersState } from './AdminUserFiltersBar.js';

const initialFilters: AdminFiltersState = {
  search: '',
  role: 'all',
  status: 'all',
  createdFrom: '',
  createdTo: '',
};

export const AdminUsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [filters, setFilters] = useState<AdminFiltersState>(initialFilters);

  const queryParams = new URLSearchParams();
  if (filters.search.trim()) queryParams.set('query', filters.search.trim());
  if (filters.role !== 'all') queryParams.set('role', filters.role);
  if (filters.status !== 'all') queryParams.set('status', filters.status);
  if (filters.createdFrom) queryParams.set('created_from', filters.createdFrom);
  if (filters.createdTo) queryParams.set('created_to', filters.createdTo);

  const { data, isLoading } = useQuery<{ success: boolean; data: AdminUserSummary[] }>({
    queryKey: ['admin-users', queryParams.toString()],
    queryFn: () => ApiClient.get(`/admin/users?${queryParams.toString()}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      ApiClient.put(`/admin/users/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: Error) => dialog.alert(err.message, 'Error al cambiar estado'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      ApiClient.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      dialog.alert('Rol de usuario actualizado con éxito.', 'Rol actualizado');
    },
    onError: (err: Error) => dialog.alert(err.message, 'Error al cambiar rol'),
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

  const handleRoleChange = async (user: AdminUserSummary, newRole: Role) => {
    if (user.role === newRole) return;
    const confirmed = await dialog.confirm({
      title: 'Cambiar rol de usuario',
      message: `¿Deseas cambiar el rol de @${user.username} de [${user.role.toUpperCase()}] a [${newRole.toUpperCase()}]?`,
      confirmText: 'Cambiar rol',
    });
    if (confirmed) {
      roleMutation.mutate({ id: user.id, role: newRole });
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
      <AdminUserFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(initialFilters)}
      />

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
              onRoleChange={handleRoleChange}
            />
          ))
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios con los filtros aplicados.</div>
        )}
      </div>
    </div>
  );
};
