import React from 'react';
import { createPortal } from 'react-dom';
import { Ban, Flag, MessageSquare, MoreHorizontal, UserMinus } from 'lucide-react';
import { usePopoverMenu } from '../../hooks/usePopoverMenu.js';

interface Props {
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isHovering: boolean;
  isLoadingFollow: boolean;
  isStartingChat: boolean;
  isBlocked: boolean;
  hasBlockedViewer: boolean;
  isLoadingBlock: boolean;
  followsYou?: boolean;
  isRemovingFollower?: boolean;
  onEditClick?: () => void;
  onReportClick: () => void;
  onBlockToggle: () => void;
  onRemoveFollower?: () => void;
  onStartChat: () => void;
  onFollowToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ProfileHeaderActions: React.FC<Props> = ({
  isOwnProfile, isAuthenticated, isFollowing, isHovering, isLoadingFollow, isStartingChat,
  isBlocked, hasBlockedViewer, isLoadingBlock, followsYou = false, isRemovingFollower = false,
  onEditClick, onReportClick, onBlockToggle, onRemoveFollower,
  onStartChat, onFollowToggle, onMouseEnter, onMouseLeave,
}) => {
  const { menuId, triggerRef, menuRef, isOpen, supportsPopover, useJsPos, coords, closeMenu, toggleFallback } =
    usePopoverMenu({ width: 208 });

  if (isOwnProfile) {
    return (
      <button type="button" onClick={onEditClick} className="px-3.5 sm:px-4 py-1.5 text-xs font-bold text-dark-text hover:text-brand-400 bg-dark-card border border-dark-border hover:border-brand-500 transition-colors pixel-button">
        Editar perfil
      </button>
    );
  }

  const panelStyle: React.CSSProperties | undefined = useJsPos
    ? { position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }
    : undefined;

  const panel = isAuthenticated && (supportsPopover || isOpen) ? (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      aria-label="Opciones del perfil"
      popover={supportsPopover ? 'auto' : undefined}
      data-js-positioned={useJsPos ? 'true' : undefined}
      onClick={(e) => e.stopPropagation()}
      style={panelStyle}
      className="pub-menu-popover w-52 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs font-mono"
    >
      {followsYou && !isBlocked && onRemoveFollower && (
        <button
          type="button"
          role="menuitem"
          disabled={isRemovingFollower}
          onClick={(e) => {
            e.stopPropagation();
            closeMenu(false);
            onRemoveFollower();
          }}
          className="w-full px-3 py-2 text-left hover:bg-dark-card text-dark-text hover:text-red-400 flex items-center gap-2 disabled:opacity-50"
        >
          <UserMinus className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
          <span>Eliminar seguidor</span>
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        disabled={isLoadingBlock}
        onClick={(e) => {
          e.stopPropagation();
          closeMenu(false);
          onBlockToggle();
        }}
        className={`w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 disabled:opacity-50 ${
          followsYou && !isBlocked && onRemoveFollower ? 'border-t border-dark-border/50' : ''
        } ${isBlocked ? 'text-brand-400' : 'text-dark-text hover:text-red-400'}`}
      >
        <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
        <span>{isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={(e) => {
          e.stopPropagation();
          closeMenu(false);
          onReportClick();
        }}
        className="w-full px-3 py-2 text-left hover:bg-dark-card text-dark-muted hover:text-red-400 flex items-center gap-2 border-t border-dark-border/50"
      >
        <Flag className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
        <span>Reportar usuario</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated && !isBlocked && !hasBlockedViewer && (
        <button type="button" onClick={onStartChat} disabled={isStartingChat} className="p-2 border border-brand-500/60 text-brand-400 hover:bg-brand-500/10 bg-dark-card pixel-button flex items-center gap-1 text-xs" title="Enviar mensaje" aria-label="Enviar mensaje">
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Mensaje</span>
        </button>
      )}
      {isBlocked ? (
        <button type="button" onClick={onBlockToggle} disabled={isLoadingBlock} className="px-3.5 sm:px-4 py-1.5 text-xs font-bold border border-red-500 text-red-400 bg-red-950/20 hover:bg-red-950/40 transition-colors pixel-button">
          Bloqueado
        </button>
      ) : !hasBlockedViewer && (
        <button
          type="button" onClick={onFollowToggle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} disabled={isLoadingFollow}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold transition-colors pixel-button ${
            isFollowing
              ? isHovering ? 'border border-red-500 text-red-400 bg-red-950/20' : 'border border-dark-border text-white bg-dark-card'
              : 'border border-brand-500 text-black bg-brand-500 hover:bg-brand-600'
          }`}
        >
          {isFollowing ? (isHovering ? 'Dejar de seguir' : 'Siguiendo') : 'Seguir'}
        </button>
      )}
      {isAuthenticated && (
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menuId}
            popovertarget={supportsPopover ? menuId : undefined}
            popovertargetaction={supportsPopover ? 'toggle' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (!supportsPopover) toggleFallback();
            }}
            className="p-2 border border-dark-border text-dark-muted hover:text-white hover:border-brand-500 bg-dark-card pixel-button transition-colors"
            title="Más opciones del perfil"
            aria-label="Más opciones del perfil"
          >
            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {panel && (typeof document !== 'undefined' ? createPortal(panel, document.body) : panel)}
        </div>
      )}
    </div>
  );
};
