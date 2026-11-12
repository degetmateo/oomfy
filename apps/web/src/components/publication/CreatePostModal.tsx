import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { PublicationCreator } from './PublicationCreator.js';
import { useUIStore } from '../../stores/uiStore.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreatePostModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { quotedPublication, closePostModal } = useUIStore();

  const handleClose = () => {
    closePostModal();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-modal-title"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 font-mono"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-dark-bg border-2 border-dark-border shadow-pixel overflow-visible mt-12 sm:mt-0"
      >
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <h2 id="create-post-modal-title" className="font-bold text-xs text-brand-400 uppercase tracking-wider">
            {quotedPublication ? 'Citar publicación' : 'Nueva publicación'}
          </h2>
          <button type="button" onClick={handleClose} aria-label="Cerrar" className="p-1 hover:bg-dark-border text-white">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <PublicationCreator
          autoFocus
          quotedPublication={quotedPublication}
          onRemoveQuoted={() => useUIStore.setState({ quotedPublication: null })}
          onCreated={() => {
            onCreated?.();
            handleClose();
          }}
        />
      </div>
    </div>
  );
};
