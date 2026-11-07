import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { AdminUserSummary, Role } from '@oomfy/shared';
import { AdminUserRow } from './AdminUserRow.js';
import { AdminUserFiltersBar, AdminFiltersState } from './AdminUserFiltersBar.js';
import { AdminEditUserModal } from './AdminEditUserModal.js';

const initialFilters: AdminFiltersState = {
  search: '', role: 'all', status: 'all', createdFrom: '', createdTo: '',
};

export const AdminUsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [filters, setFilters] = useState<AdminFiltersState>(initialFilters);
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);

  const q = new URLSearchParams();
  if (filters.search.trim()) q.set('query', filters.search.trim());
  if (filters.role !== 'all') q.set('role', filters.role);
  if (filters.status !== 'all') q.set('status', filters.status);
  if (filters.createdFrom) q.set('created_from', filters.createdFrom);
  if (filters.createdTo) q.set('created_to', filters.createdTo);

  const { data, isLoading } = useQuery<{ success: boolean; data: AdminUserSummary[] }>({
    queryKey: ['admin-users', q.toString()],
    queryFn: () => ApiClient.get(`/admin/users?${q.toString()}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => ApiClient.put(`/admin/users/${id}/status`, { status }),
    onSuccess: invalidate,
    onError: (err: Error) => dialog.alert(err.message, 'Error al cambiar estado'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => ApiClient.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { invalidate(); dialog.alert('Rol actualizado.', 'Éxito'); },
    onError: (err: Error) => dialog.alert(err.message, 'Error al cambiar rol'),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => ApiClient.post(`/admin/users/${userId}/revoke-sessions`),
    onSuccess: () => dialog.alert('Sesiones revocadas con éxito.', 'Sesiones revocadas'),
    onError: (err: Error) => dialog.alert(err.message, 'Error al cerrar sesiones'),
  });

  const handleToggleStatus = async (user: AdminUserSummary) => {
    const isActivating = user.status === 'suspended' || user.status === 'pending';
    const confirmed = await dialog.confirm({
      title: isActivating ? 'Activar cuenta' : 'Suspender usuario',
      message: `¿Deseas ${isActivating ? 'activar' : 'suspender'} la cuenta de @${user.username}?`,
      isDanger: !isActivating, confirmText: isActivating ? 'Activar' : 'Suspender',
    });
    if (confirmed) statusMutation.mutate({ id: user.id, status: isActivating ? 'active' : 'suspended' });
  };

  const handleRoleChange = async (user: AdminUserSummary, newRole: Role) => {
    if (user.role === newRole) return;
    const confirmed = await dialog.confirm({
      title: 'Cambiar rol', message: `¿Cambiar rol de @${user.username} a ${newRole.toUpperCase()}?`, confirmText: 'Cambiar',
    });
    if (confirmed) roleMutation.mutate({ id: user.id, role: newRole });
  };

  const handleRevokeSessions = async (user: AdminUserSummary) => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar sesiones', message: `¿Cerrar todas las sesiones de @${user.username}?`, isDanger: true, confirmText: 'Cerrar',
    });
    if (confirmed) revokeMutation.mutate(user.id);
  };

  const users = data?.data || [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <AdminUserFiltersBar filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
      <div className="divide-y divide-dark-border border border-dark-border bg-dark-bg">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Buscando usuarios...</div>
        ) : users.length > 0 ? (
          users.map((u) => (
            <AdminUserRow
              key={u.id} user={u} onToggleStatus={handleToggleStatus}
              onRevokeSessions={handleRevokeSessions} onRoleChange={handleRoleChange} onEdit={setEditingUser}
            />
          ))
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>
        )}
      </div>
      <AdminEditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSuccess={invalidate} />
    </div>
  );
};
