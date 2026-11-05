import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, CheckCircle, XCircle, Trash2, UserX, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { Report, ReportStatus } from '@oomfy/shared';

export const AdminReportsList: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading } = useQuery<{
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
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      ApiClient.put(`/staff/reports/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-reports'] });
    },
    onError: (err: Error) => dialog.alert(err.message, 'Error al actualizar reporte'),
  });

  const deletePublication = async (report: Report) => {
    const ok = await dialog.confirm({
      title: 'Eliminar publicación reportada',
      message: '¿Estás seguro de que deseas eliminar permanentemente esta publicación?',
      isDanger: true,
    });
    if (!ok) return;
    try {
      await ApiClient.delete(`/admin/publications/${report.target_id}`);
      await updateStatusMutation.mutateAsync({ id: report.id, status: 'resolved' });
      dialog.alert('Publicación eliminada y reporte marcado como resuelto.', 'Éxito');
    } catch (err: any) {
      dialog.alert(err.message, 'Error al eliminar');
    }
  };

  const suspendUser = async (report: Report) => {
    const ok = await dialog.confirm({
      title: 'Suspender usuario reportado',
      message: `¿Estás seguro de que deseas suspender la cuenta de @${report.target_username || report.target_id}?`,
      isDanger: true,
    });
    if (!ok) return;
    try {
      await ApiClient.put(`/admin/users/${report.target_id}/status`, { status: 'suspended' });
      await updateStatusMutation.mutateAsync({ id: report.id, status: 'resolved' });
      dialog.alert('Usuario suspendido y reporte marcado como resuelto.', 'Éxito');
    } catch (err: any) {
      dialog.alert(err.message, 'Error al suspender');
    }
  };

  const deleteMessage = async (report: Report) => {
    const ok = await dialog.confirm({
      title: 'Eliminar mensaje reportado',
      message: '¿Estás seguro de que deseas eliminar este mensaje?',
      isDanger: true,
    });
    if (!ok) return;
    try {
      await ApiClient.delete(`/chats/messages/${report.target_id}`);
      await updateStatusMutation.mutateAsync({ id: report.id, status: 'resolved' });
      dialog.alert('Mensaje eliminado y reporte resuelto.', 'Éxito');
    } catch (err: any) {
      dialog.alert(err.message, 'Error al eliminar');
    }
  };

  const reports = data?.data?.reports || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="flex items-center gap-2 border-b border-dark-border pb-2 text-xs">
        {['pending', 'resolved', 'dismissed', ''].map((st) => (
          <button
            key={st || 'all'}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3 py-1 font-bold transition-colors uppercase text-[11px] ${
              statusFilter === st
                ? 'bg-brand-500 text-black pixel-button'
                : 'text-dark-muted hover:text-white border border-dark-border'
            }`}
          >
            {st === 'pending'
              ? 'Pendientes'
              : st === 'resolved'
              ? 'Resueltos'
              : st === 'dismissed'
              ? 'Descartados'
              : 'Todos'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando reportes...</div>
      ) : reports.length > 0 ? (
        <div className="divide-y divide-dark-border border border-dark-border bg-dark-card/20">
          {reports.map((report) => (
            <div key={report.id} className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <Flag className="w-3.5 h-3.5" />
                  <span>{report.reason}</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${
                    report.status === 'pending'
                      ? 'border-yellow-500 text-yellow-400'
                      : report.status === 'resolved'
                      ? 'border-brand-500 text-brand-400'
                      : 'border-dark-border text-dark-muted'
                  }`}
                >
                  {report.status === 'pending'
                    ? 'Pendiente'
                    : report.status === 'resolved'
                    ? 'Resuelto'
                    : 'Descartado'}
                </span>
              </div>

              <div className="text-xs text-dark-text/90 font-sans">
                {report.target_type === 'publication' ? (
                  <div className="p-2.5 bg-dark-bg border border-dark-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-dark-muted font-mono mb-1">
                        Publicación de @{report.target_username || 'desconocido'}
                      </p>
                      {report.target_content && (
                        <p className="italic text-xs text-white truncate max-w-md">
                          "{report.target_content}"
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/publication/${report.target_id}`}
                      target="_blank"
                      className="p-1 text-brand-400 hover:text-brand-300"
                      title="Ver publicación"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ) : report.target_type === 'message' ? (
                  <div className="p-2.5 bg-dark-bg border border-dark-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-dark-muted font-mono mb-1">
                        Mensaje de @{report.target_username || 'desconocido'}
                      </p>
                      {report.target_content && (
                        <p className="italic text-xs text-white truncate max-w-md">
                          "{report.target_content}"
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-dark-bg border border-dark-border flex items-center justify-between gap-2">
                    <p className="text-xs text-white font-mono">
                      Perfil de @{report.target_username || report.target_id}
                    </p>
                    <Link
                      to={`/${report.target_username || report.target_id}`}
                      target="_blank"
                      className="p-1 text-brand-400 hover:text-brand-300"
                      title="Ver perfil"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>

              {report.details && (
                <p className="text-xs text-dark-muted font-sans bg-dark-bg/60 p-2 border border-dark-border/50">
                  <span className="font-bold text-dark-text font-mono">Detalles: </span>
                  {report.details}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-dark-muted pt-2 border-t border-dark-border/40">
                <span>
                  Reportado por @{report.reporter_username} ·{' '}
                  {new Date(report.created_at).toLocaleString()}
                </span>

                <div className="flex items-center gap-2">
                  {report.status === 'pending' && (
                    <>
                      {report.target_type === 'publication' && (
                        <button
                          type="button"
                          onClick={() => deletePublication(report)}
                          className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar post</span>
                        </button>
                      )}
                      {report.target_type === 'message' && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(report)}
                          className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar mensaje</span>
                        </button>
                      )}
                      {report.target_type === 'user' && (
                        <button
                          type="button"
                          onClick={() => suspendUser(report)}
                          className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Suspender</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({ id: report.id, status: 'resolved' })
                        }
                        className="px-2 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black text-xs font-bold flex items-center gap-1 pixel-button"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Resolver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({ id: report.id, status: 'dismissed' })
                        }
                        className="px-2 py-1 border border-dark-border text-dark-muted hover:text-white text-xs font-bold flex items-center gap-1 pixel-button"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Descartar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted border border-dark-border bg-dark-card/20">
          No hay reportes en esta categoría.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border border-dark-border text-white disabled:opacity-40 pixel-button"
          >
            Anterior
          </button>
          <span className="text-dark-muted">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border border-dark-border text-white disabled:opacity-40 pixel-button"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};
