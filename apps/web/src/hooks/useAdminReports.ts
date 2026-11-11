import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { Report, ReportStatus } from '@oomfy/shared';

export function useAdminReports() {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState<number>(1);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-reports'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const { data, isLoading, isFetching, refetch } = useQuery<{
    success: boolean;
    data: { reports: Report[]; total: number; page: number; totalPages: number };
  }>({
    queryKey: ['staff-reports', statusFilter, page],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}&page=${page}` : `?page=${page}`;
      return ApiClient.get(`/staff/reports${q}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) => ApiClient.put(`/staff/reports/${id}`, { status }),
    onSuccess: invalidateAll,
    onError: (err: Error) => dialog.alert(err.message, 'Error al actualizar reporte'),
  });

  const runAction = async (opts: { title: string; message: string; endpoint: string; method: 'delete' | 'put'; body?: any; reportId: string; successText: string }) => {
    const ok = await dialog.confirm({ title: opts.title, message: opts.message, isDanger: true });
    if (!ok) return;
    try {
      if (opts.method === 'delete') await ApiClient.delete(opts.endpoint);
      else await ApiClient.put(opts.endpoint, opts.body);
      await updateStatusMutation.mutateAsync({ id: opts.reportId, status: 'resolved' });
      dialog.alert(opts.successText, 'Éxito');
    } catch (err: any) {
      dialog.alert(err.message, 'Error');
    }
  };

  return {
    reports: data?.data?.reports || [],
    totalPages: data?.data?.totalPages || 1,
    isLoading, isFetching, refetch,
    statusFilter, setStatusFilter: (st: string) => { setStatusFilter(st); setPage(1); },
    page, setPage,
    updateStatus: (id: string, status: ReportStatus) => updateStatusMutation.mutate({ id, status }),
    deletePublication: (r: Report) => runAction({ title: 'Eliminar publicación reportada', message: '¿Estás seguro de que deseas eliminar permanentemente esta publicación?', endpoint: `/publications/${r.target_id}`, method: 'delete', reportId: r.id, successText: 'Publicación eliminada y reporte marcado como resuelto.' }),
    suspendUser: (r: Report) => runAction({ title: 'Suspender usuario reportado', message: `¿Estás seguro de que deseas suspender la cuenta de @${r.target_username || r.target_id}?`, endpoint: `/admin/users/${r.target_id}/status`, method: 'put', body: { status: 'suspended' }, reportId: r.id, successText: 'Usuario suspendido y reporte marcado como resuelto.' }),
    deleteMessage: (r: Report) => runAction({ title: 'Eliminar mensaje reportado', message: '¿Estás seguro de que deseas eliminar este mensaje?', endpoint: `/chats/messages/${r.target_id}`, method: 'delete', reportId: r.id, successText: 'Mensaje eliminado y reporte resuelto.' }),
  };
}

