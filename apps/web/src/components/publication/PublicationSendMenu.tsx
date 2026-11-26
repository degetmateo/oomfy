import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Share2, ExternalLink, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { usePopoverMenu } from '../../hooks/usePopoverMenu.js';
import { SendPublicationModal } from '../modals/SendPublicationModal.js';

interface Props {
  postId: string;
  authorUsername?: string;
  contentPreview?: string | null;
}

function legacyCopyText(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const previousFocus = document.activeElement as HTMLElement | null;
  const field = Object.assign(document.createElement('textarea'), { value: text });
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

export const PublicationSendMenu: React.FC<Props> = ({ postId, authorUsername, contentPreview }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { menuId, triggerRef, menuRef, isOpen, supportsPopover, useJsPos, coords, closeMenu, toggleFallback } =
    usePopoverMenu({ width: 216 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const lastFeedbackRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announceFeedback = (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = text === lastFeedbackRef.current ? `${text}\u00A0` : text;
    lastFeedbackRef.current = text;
    setShareFeedback(next);
    timerRef.current = setTimeout(() => setShareFeedback(''), 2000);
  };

  const handleExternalShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/publication/${postId}`;
    const shareData = {
      title: authorUsername ? `Publicación de @${authorUsername} en oomfy` : 'Publicación en oomfy',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        closeMenu(false);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          closeMenu(false);
          return;
        }
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (!legacyCopyText(shareUrl)) {
        throw new Error('Copy failed');
      }
      announceFeedback('Enlace copiado');
    } catch {
      if (legacyCopyText(shareUrl)) announceFeedback('Enlace copiado');
      else announceFeedback('Error al copiar');
    }
    setTimeout(() => closeMenu(false), 700);
  };

  const handleOpenMessageModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeMenu(false);
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    setIsModalOpen(true);
  };

  const panelStyle: React.CSSProperties | undefined = useJsPos
    ? { position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }
    : undefined;

  const panel = (supportsPopover || isOpen) ? (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      aria-label="Opciones para enviar publicación"
      popover={supportsPopover ? 'auto' : undefined}
      data-js-positioned={useJsPos ? 'true' : undefined}
      data-no-card-nav="true"
      data-no-swipe="true"
      onClick={(e) => e.stopPropagation()}
      style={panelStyle}
      className="pub-menu-popover w-54 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs font-mono"
    >
      <button
        type="button"
        role="menuitem"
        onClick={handleOpenMessageModal}
        className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text"
      >
        <MessageSquare className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" aria-hidden="true" />
        <span>Enviar por mensaje</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={handleExternalShare}
        className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text border-t border-dark-border/50"
      >
        {shareFeedback ? (
          <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5 text-dark-muted flex-shrink-0" aria-hidden="true" />
        )}
        <span>{shareFeedback || 'Compartir externamente'}</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="relative flex items-center" data-no-card-nav="true">
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
        title="Enviar publicación"
        aria-label="Enviar publicación"
        className="flex items-center justify-center min-w-[24px] min-h-[24px] py-1 px-1.5 -mx-1.5 rounded hover:bg-dark-border/40 hover:text-brand-400 transition-colors"
      >
        <Share2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" data-icon="send-menu" />
      </button>
      <span role="status" className="sr-only">{shareFeedback}</span>
      {panel && (typeof document !== 'undefined' ? createPortal(panel, document.body) : panel)}
      {isModalOpen && (
        <SendPublicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          postId={postId}
          authorUsername={authorUsername}
          contentPreview={contentPreview}
        />
      )}
    </div>
  );
};
