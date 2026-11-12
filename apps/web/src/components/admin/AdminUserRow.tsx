import React from 'react';
import { Ban, CheckCircle, KeyRound, ShieldAlert, Pencil, UserCheck } from 'lucide-react';
import { AdminUserSummary, Role } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';

interface AdminUserRowProps {
  user: AdminUserSummary;
  onToggleStatus: (user: AdminUserSummary) => void;
  onRevokeSessions: (user: AdminUserSummary) => void;
  onRoleChange: (user: AdminUserSummary, newRole: Role) => void;
  onEdit: (user: AdminUserSummary) => void;
}

export const AdminUserRow: React.FC<AdminUserRowProps> = ({
  user,
  onToggleStatus,
  onRevokeSessions,
  onRoleChange,
  onEdit,
}) => {
  const isSuspended = user.status === 'suspended';
  const isPending = user.status === 'pending';
  const formattedDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '';

  return (
    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          {isPending && (
            <span className="px-1 text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
              PENDIENTE
            </span>
          )}
        </div>
        <p className="text-[10px] text-dark-muted truncate mt-0.5">
          {formattedDate && <time dateTime={user.created_at}>Creado: {formattedDate}</time>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-dark-muted" />
          <select
            value={user.role}
            onChange={(e) => onRoleChange(user, e.target.value as Role)}
            className="bg-dark-card border border-dark-border text-[11px] text-white px-2 py-1 focus:outline-none focus:border-brand-500 font-mono"
            title="Cambiar rol del usuario"
          >
            <option value="member">Miembro</option>
            <option value="mod">Mod</option>
            <option value="tester">Tester</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onEdit(user)}
          title="Editar datos del usuario"
          className="p-1.5 text-xs border border-dark-border text-dark-muted hover:text-brand-400 hover:border-brand-500/50 pixel-button flex items-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[10px]">Editar</span>
        </button>

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
            isSuspended || isPending
              ? 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
              : 'border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black'
          }`}
        >
          {isSuspended ? <CheckCircle className="w-3 h-3" /> : isPending ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
          <span>{isSuspended ? 'Reactivar' : isPending ? 'Activar' : 'Suspender'}</span>
        </button>
      </div>
    </div>
  );
};
