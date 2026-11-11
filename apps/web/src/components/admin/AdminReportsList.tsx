import React from 'react';
import { useAdminReports } from '../../hooks/useAdminReports.js';
import { AdminReportCard } from './AdminReportCard.js';

const FILTER_LABELS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'dismissed', label: 'Descartados' },
  { key: '', label: 'Todos' },
];

export const AdminReportsList: React.FC = () => {
  const {
    reports, totalPages, isLoading, statusFilter, setStatusFilter,
    page, setPage, updateStatus, deletePublication, suspendUser, deleteMessage,
  } = useAdminReports();

  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="flex items-center gap-2 border-b border-dark-border pb-2 text-xs overflow-x-auto">
        {FILTER_LABELS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 font-bold transition-colors uppercase text-[11px] whitespace-nowrap ${
              statusFilter === f.key ? 'bg-brand-500 text-black pixel-button' : 'text-dark-muted hover:text-white border border-dark-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando reportes...</div>
      ) : reports.length > 0 ? (
        <div className="divide-y divide-dark-border border border-dark-border bg-dark-card/20">
          {reports.map((report) => (
            <AdminReportCard
              key={report.id}
              report={report}
              onUpdateStatus={updateStatus}
              onDeletePublication={deletePublication}
              onDeleteMessage={deleteMessage}
              onSuspendUser={suspendUser}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted border border-dark-border bg-dark-card/20">
          No hay reportes en esta categoría.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs pt-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border border-dark-border text-white disabled:opacity-40 pixel-button">
            Anterior
          </button>
          <span className="text-dark-muted">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border border-dark-border text-white disabled:opacity-40 pixel-button">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};
