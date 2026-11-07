import React from 'react';
import { CornerDownRight, X } from 'lucide-react';

interface Props {
  replyingTo: any;
  onCancel: () => void;
}

export const ChatReplyBanner: React.FC<Props> = ({ replyingTo, onCancel }) => {
  if (!replyingTo) return null;
  return (
    <div className="px-3 py-1.5 bg-dark-card/60 border-b border-dark-border/60 flex items-center justify-between text-xs text-dark-muted font-mono">
      <div className="flex items-center gap-1.5 truncate">
        <CornerDownRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span>Respondiendo a <strong className="text-white">@{replyingTo.sender?.username}</strong>:</span>
        <span className="truncate italic max-w-xs">{replyingTo.content || '(archivo adjunto)'}</span>
      </div>
      <button type="button" onClick={onCancel} className="p-0.5 hover:text-white text-dark-muted" title="Cancelar respuesta">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

