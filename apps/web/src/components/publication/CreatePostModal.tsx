import React from 'react';
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

  if (!isOpen) return null;

  const handleClose = () => {
    closePostModal();
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 font-mono"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-dark-bg border-2 border-dark-border shadow-pixel overflow-hidden mt-12 sm:mt-0"
      >
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <span className="font-bold text-xs text-brand-400 uppercase tracking-wider">
            {quotedPublication ? 'Citar publicación' : 'Nueva publicación'}
          </span>
          <button onClick={handleClose} className="p-1 hover:bg-dark-border text-white">
            <X className="w-5 h-5" />
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
