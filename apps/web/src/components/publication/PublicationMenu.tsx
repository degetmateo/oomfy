import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Trash2, Copy, Check, Flag, BarChart2, Pin } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { usePinPublication } from '../../hooks/usePinPublication.js';
import { usePopoverMenu } from '../../hooks/usePopoverMenu.js';
import { ReportModal } from '../modals/ReportModal.js';

interface Props {
  postId: string;
  authorId: string;
  authorUsername: string;
  content?: string | null;
  canDelete: boolean;
  onDelete?: () => void;
}

export const PublicationMenu: React.FC<Props> = ({ postId, authorId, authorUsername, content, canDelete, onDelete }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { isPinned, togglePin, canPin } = usePinPublication(postId);
  const { menuId, triggerRef, menuRef, isOpen, supportsPopover, useJsPos, coords, closeMenu, toggleFallback } = usePopoverMenu();
  const [copied, setCopied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/publication/${postId}`);
    setCopied(true);
    setTimeout(() => { setCopied(false); closeMenu(false); }, 1200);
  };

  const panelStyle: React.CSSProperties | undefined = useJsPos
    ? { position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }
    : undefined;

  const panel = (supportsPopover || isOpen) ? (
    <div
      id={menuId}
      ref={menuRef}
      popover={supportsPopover ? 'auto' : undefined}
      data-js-positioned={useJsPos ? 'true' : undefined}
      data-no-card-nav="true"
      data-no-swipe="true"
      onClick={(e) => e.stopPropagation()}
      style={panelStyle}
      className="pub-menu-popover w-48 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs font-mono"
    >
      <button type="button" onClick={handleCopy} className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text">
        {copied ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); closeMenu(false); navigate(`/publication/${postId}/interactions`); }} className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text border-t border-dark-border/50">
        <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
        <span>Interacciones</span>
      </button>
      {canPin && (
        <button type="button" onClick={(e) => { closeMenu(false); togglePin(e); }} className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text border-t border-dark-border/50">
          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-red-400 rotate-45' : 'text-brand-400'}`} />
          <span>{isPinned ? 'Desfijar de tu perfil' : 'Fijar en tu perfil'}</span>
        </button>
      )}
      {isAuthenticated && user?.id !== authorId && (
        <button type="button" onClick={(e) => { e.stopPropagation(); closeMenu(false); setIsReportOpen(true); }} className="w-full px-3 py-2 text-left hover:bg-dark-card text-dark-muted hover:text-red-400 flex items-center gap-2 border-t border-dark-border/50">
          <Flag className="w-3.5 h-3.5 text-red-400" />
          <span>Reportar</span>
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={(e) => { e.stopPropagation(); closeMenu(false); onDelete?.(); }} className="w-full px-3 py-2 text-left hover:bg-red-950/40 text-red-400 flex items-center gap-2 border-t border-dark-border/50">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar</span>
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="relative" data-no-card-nav="true">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        popovertarget={supportsPopover ? menuId : undefined}
        popovertargetaction={supportsPopover ? 'toggle' : undefined}
        onClick={(e) => { e.stopPropagation(); if (!supportsPopover) toggleFallback(); }}
        className="p-1 text-dark-muted hover:text-white transition-colors"
        title="Opciones de publicación"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {panel && (typeof document !== 'undefined' ? createPortal(panel, document.body) : panel)}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="publication" targetId={postId} targetUsername={authorUsername} targetContent={content || undefined} />
    </div>
  );
};
