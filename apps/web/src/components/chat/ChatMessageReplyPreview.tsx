import React from 'react';
import { Link } from 'react-router-dom';
import { CornerDownRight } from 'lucide-react';

interface Props {
  replyTo: any;
  replyToId?: string | null;
  onJumpToMessage?: (messageId: string) => void;
}

export const ChatMessageReplyPreview: React.FC<Props> = ({ replyTo, replyToId, onJumpToMessage }) => {
  if (!replyTo) return null;
  const targetId = replyToId || replyTo.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetId && onJumpToMessage) onJumpToMessage(targetId);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(e as any); } }}
      className="flex items-center gap-1.5 text-xs md:text-sm text-dark-muted mb-1 select-none cursor-pointer group/reply w-fit max-w-full hover:text-white transition-colors"
      title="Ir al mensaje respondido"
      aria-label={`Ver mensaje respondido de @${replyTo.sender_username || 'usuario'}`}
    >
      <CornerDownRight className="w-4 h-4 text-brand-400/80 group-hover/reply:text-brand-400 flex-shrink-0" aria-hidden="true" />
      {replyTo.sender_username ? (
        <Link to={`/${replyTo.sender_username}`} onClick={(e) => e.stopPropagation()} className="font-bold text-brand-400 hover:underline">
          @{replyTo.sender_username}
        </Link>
      ) : <span className="font-bold text-brand-400">@{replyTo.sender_username || 'usuario'}</span>}
      <span className="truncate max-w-sm text-dark-muted/80 group-hover/reply:text-dark-text">{replyTo.content || '(archivo adjunto)'}</span>
    </div>
  );
};
