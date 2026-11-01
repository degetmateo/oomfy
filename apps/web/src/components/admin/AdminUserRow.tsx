import React from 'react';
import { Ban, CheckCircle, KeyRound } from 'lucide-react';
import { AdminUserSummary } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';

interface AdminUserRowProps {
  user: AdminUserSummary;
  onToggleStatus: (user: AdminUserSummary) => void;
  onRevokeSessions: (user: AdminUserSummary) => void;
}

export const AdminUserRow: React.FC<AdminUserRowProps> = ({
  user,
  onToggleStatus,
  onRevokeSessions,
}) => {
  const isSuspended = user.status === 'suspended';

  return (
    <div className="p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-white truncate">{user.name}</span>
          <span className="text-[11px] text-dark-muted">@{user.username}</span>
          <PixelBadge role={user.role} />
          {isSuspended && (
            <span className="px-1 text-[9px] bg-red-500/20 text-red-400 border border-red-500/40">
              SUSPENDIDO
            </span>
          )}
        </div>
        <p className="text-[10px] text-dark-muted truncate mt-0.5">{user.email}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onRevokeSessions(user)}
          title="Cerrar todas las sesiones de este usuario"
          className="p-1.5 text-xs border border-dark-border text-dark-muted hover:text-white hover:border-gray-500 pixel-button flex items-center gap-1"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[10px]">Cerrar sesiones</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleStatus(user)}
          className={`px-2.5 py-1 text-[11px] font-bold border pixel-button flex items-center gap-1 ${
            isSuspended
              ? 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
              : 'border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black'
          }`}
        >
          {isSuspended ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
          <span>{isSuspended ? 'Reactivar' : 'Suspender'}</span>
        </button>
      </div>
    </div>
  );
};

