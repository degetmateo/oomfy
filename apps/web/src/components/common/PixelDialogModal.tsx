import React, { useEffect } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { useDialogStore } from '../../stores/dialogStore.js';

export const PixelDialogModal: React.FC = () => {
  const {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    handleConfirm,
    handleCancel,
  } = useDialogStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleConfirm, handleCancel]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleCancel}
      role={type === 'alert' || type === 'danger' ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby="pixel-dialog-title"
      aria-describedby="pixel-dialog-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-dark-bg border-2 border-dark-border shadow-pixel overflow-hidden"
      >
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <div className="flex items-center gap-2">
            {type === 'danger' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
            ) : (
              <Info className="w-4 h-4 text-brand-400" aria-hidden="true" />
            )}
            <h2 id="pixel-dialog-title" className="font-bold text-xs text-white uppercase tracking-wider">{title}</h2>
          </div>
          <button type="button" onClick={handleCancel} aria-label="Cerrar" className="p-1 hover:bg-dark-border text-dark-muted hover:text-white transition-colors">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div id="pixel-dialog-message" className="p-4 text-xs text-dark-text whitespace-pre-line leading-relaxed font-sans">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 border-t border-dark-border bg-dark-card/30">
          {type !== 'alert' && (
            <button
              type="button"
              autoFocus={type === 'danger'}
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs font-bold text-dark-text hover:text-white bg-dark-card border border-dark-border hover:border-dark-muted transition-colors pixel-button"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus={type !== 'danger'}
            onClick={handleConfirm}
            className={`px-4 py-1.5 text-xs font-bold transition-colors pixel-button ${
              type === 'danger'
                ? 'bg-red-500 text-white hover:bg-red-600 border border-red-400'
                : 'bg-brand-500 text-black hover:bg-brand-400 border border-brand-400'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

