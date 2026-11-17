import React from 'react';
import { ArrowDown } from 'lucide-react';

interface Props {
  visible: boolean;
  onClick: () => void;
}

export const ChatScrollBottomButton: React.FC<Props> = ({ visible, onClick }) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-3 right-4 z-20 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
      <button
        type="button"
        onClick={onClick}
        className="p-2.5 rounded-full bg-dark-card/90 border border-dark-border text-brand-400 hover:text-white hover:border-brand-500 shadow-xl backdrop-blur-sm transition-all flex items-center justify-center pixel-button group"
        title="Volver a los mensajes recientes"
        aria-label="Volver a los mensajes recientes"
      >
        <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
      </button>
    </div>
  );
};
