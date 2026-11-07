import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  username?: string;
}

export const ChatStartingOverlay: React.FC<Props> = ({ isOpen, username }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono">
      <div className="bg-dark-bg border-2 border-dark-border p-6 shadow-pixel flex flex-col items-center gap-3 text-center max-w-sm">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-white font-bold text-xs">
          {username ? `Iniciando conversación con @${username}...` : 'Iniciando conversación...'}
        </p>
        <p className="text-dark-muted text-[11px]">Creando bandeja de chat, por favor espera...</p>
      </div>
    </div>
  );
};

