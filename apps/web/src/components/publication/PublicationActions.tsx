import React from 'react';
import { PixelThumb } from '../icons/PixelThumb.js';
import { PixelShare } from '../icons/PixelShare.js';
import { PixelQuote } from '../icons/PixelQuote.js';
import { PixelComment } from '../icons/PixelComment.js';
import { usePublicationActions } from '../../hooks/usePublicationActions.js';

interface Props {
  postId: string;
  initialUpvotes: number;
  initialIsUpvoted?: boolean;
  initialShares: number;
  initialIsShared?: boolean;
  initialIsQuoted?: boolean;
  quotesCount?: number;
  commentsCount: number;
  onCommentClick?: () => void;
  onQuoteClick?: () => void;
}

export const PublicationActions: React.FC<Props> = ({
  postId,
  initialUpvotes,
  initialIsUpvoted = false,
  initialShares,
  initialIsShared = false,
  initialIsQuoted = false,
  quotesCount = 0,
  commentsCount,
  onCommentClick,
  onQuoteClick,
}) => {
  const { state, toggleUpvote, toggleShare } = usePublicationActions(postId, {
    upvotes_count: initialUpvotes,
    is_upvoted: initialIsUpvoted,
    shares_count: initialShares,
    is_shared: initialIsShared,
    is_quoted: initialIsQuoted,
    quotes_count: quotesCount,
    comments_count: commentsCount,
  });

  const handleQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuoteClick?.();
  };

  return (
    <div className="flex justify-between items-center w-full text-dark-muted text-sm font-medium select-none">
      <button
        onClick={onCommentClick}
        title="Comentar"
        className="flex items-center gap-2 rounded hover:bg-dark-border/40 hover:text-brand-400 transition-colors"
      >
        <PixelComment size={20} />
        <span>{state.comments_count}</span>
      </button>

      <button
        onClick={toggleShare}
        title="Compartir"
        aria-pressed={state.is_shared}
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${
          state.is_shared ? 'text-brand-400' : 'hover:text-brand-400'
        }`}
      >
        <PixelShare active={state.is_shared} size={20} />
        <span>{state.shares_count}</span>
      </button>

      <button
        onClick={handleQuote}
        title="Citar"
        aria-pressed={state.is_quoted}
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${
          state.is_quoted ? 'text-brand-400' : 'hover:text-brand-400'
        }`}
      >
        <PixelQuote active={state.is_quoted} size={20} />
        <span>{state.quotes_count}</span>
      </button>

      <button
        onClick={toggleUpvote}
        title="Me gusta"
        aria-pressed={state.is_upvoted}
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${
          state.is_upvoted ? 'text-brand-400' : 'hover:text-brand-400'
        }`}
      >
        <PixelThumb active={state.is_upvoted} size={20} />
        <span>{state.upvotes_count}</span>
      </button>
    </div>
  );
};
