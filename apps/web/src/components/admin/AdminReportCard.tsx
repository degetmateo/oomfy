import React from 'react';
import { Flag, CheckCircle, XCircle, Trash2, UserX, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Report, ReportStatus } from '@oomfy/shared';

interface Props {
  report: Report;
  onUpdateStatus: (id: string, status: ReportStatus) => void;
  onDeletePublication: (report: Report) => void;
  onDeleteMessage: (report: Report) => void;
  onSuspendUser: (report: Report) => void;
}

export const AdminReportCard: React.FC<Props> = ({
  report, onUpdateStatus, onDeletePublication, onDeleteMessage, onSuspendUser,
}) => {
  const badgeClass =
    report.status === 'pending' ? 'border-yellow-500 text-yellow-400' : report.status === 'resolved' ? 'border-brand-500 text-brand-400' : 'border-dark-border text-dark-muted';
  const statusLabel = report.status === 'pending' ? 'Pendiente' : report.status === 'resolved' ? 'Resuelto' : 'Descartado';

  return (
    <div className="p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
          <Flag className="w-3.5 h-3.5" /><span>{report.reason}</span>
        </span>
        <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${badgeClass}`}>{statusLabel}</span>
      </div>

      <div className="text-xs text-dark-text/90 font-sans">
        {report.target_type === 'user' ? (
          <div className="p-2.5 bg-dark-bg border border-dark-border flex items-center justify-between gap-2">
            <p className="text-xs text-white font-mono">Perfil de @{report.target_username || report.target_id}</p>
            <Link to={`/${report.target_username || report.target_id}`} target="_blank" rel="noopener noreferrer" aria-label="Ver perfil reportado" className="p-1 text-brand-400 hover:text-brand-300" title="Ver perfil">
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="p-2.5 bg-dark-bg border border-dark-border flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-dark-muted font-mono mb-1">
                {report.target_type === 'publication' ? 'Publicación' : 'Mensaje'} de @{report.target_username || 'desconocido'}
              </p>
              {report.target_content && <p className="italic text-xs text-white truncate max-w-md">"{report.target_content}"</p>}
            </div>
            {report.target_type === 'publication' && (
              <Link to={`/publication/${report.target_id}`} target="_blank" rel="noopener noreferrer" aria-label="Ver publicación reportada" className="p-1 text-brand-400 hover:text-brand-300" title="Ver publicación">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>

      {report.details && (
        <p className="text-xs text-dark-muted font-sans bg-dark-bg/60 p-2 border border-dark-border/50">
          <span className="font-bold text-dark-text font-mono">Detalles: </span>{report.details}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-dark-muted pt-2 border-t border-dark-border/40">
        <span>Reportado por @{report.reporter_username} · <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time></span>
        {report.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            {report.target_type === 'publication' && (
              <button type="button" onClick={() => onDeletePublication(report)} className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button">
                <Trash2 className="w-3 h-3" /><span>Eliminar post</span>
              </button>
            )}
            {report.target_type === 'message' && (
              <button type="button" onClick={() => onDeleteMessage(report)} className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button">
                <Trash2 className="w-3 h-3" /><span>Eliminar mensaje</span>
              </button>
            )}
            {report.target_type === 'user' && (
              <button type="button" onClick={() => onSuspendUser(report)} className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 pixel-button">
                <UserX className="w-3 h-3" /><span>Suspender</span>
              </button>
            )}
            <button type="button" onClick={() => onUpdateStatus(report.id, 'resolved')} className="px-2 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black text-xs font-bold flex items-center gap-1 pixel-button">
              <CheckCircle className="w-3 h-3" /><span>Resolver</span>
            </button>
            <button type="button" onClick={() => onUpdateStatus(report.id, 'dismissed')} className="px-2 py-1 border border-dark-border text-dark-muted hover:text-white text-xs font-bold flex items-center gap-1 pixel-button">
              <XCircle className="w-3 h-3" /><span>Descartar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

