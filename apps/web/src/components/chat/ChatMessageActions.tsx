import React from 'react';
import { Reply, Flag } from 'lucide-react';

interface Props {
  onReply?: () => void;
  onReport?: () => void;
}

export const ChatMessageActions: React.FC<Props> = ({ onReply, onReport }) => {
  return (
    <div className="hidden group-hover:flex items-center gap-0.5 bg-dark-bg/95 border border-dark-border px-1 py-0.5 shadow-pixel absolute top-1 right-2 z-10 font-mono">
      {onReply && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReply();
          }}
          className="p-1 text-dark-muted hover:text-brand-400 hover:bg-dark-card transition-colors rounded"
          title="Responder mensaje"
          aria-label="Responder"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
      )}

      {onReport && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReport();
          }}
          className="p-1 text-dark-muted hover:text-red-400 hover:bg-dark-card transition-colors rounded"
          title="Reportar mensaje"
          aria-label="Reportar"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

