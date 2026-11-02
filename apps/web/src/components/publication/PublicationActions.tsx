import React, { useState } from 'react';
import { PixelThumb } from '../icons/PixelThumb.js';
import { PixelShare } from '../icons/PixelShare.js';
import { PixelQuote } from '../icons/PixelQuote.js';
import { PixelComment } from '../icons/PixelComment.js';
import { ApiClient } from '../../services/api.js';

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
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [isUpvoted, setIsUpvoted] = useState(initialIsUpvoted);
  const [shares, setShares] = useState(initialShares);
  const [isShared, setIsShared] = useState(initialIsShared);

  const toggleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isUpvoted) {
        setUpvotes((p) => Math.max(0, p - 1));
        setIsUpvoted(false);
        await ApiClient.delete(`/interactions/${postId}/upvote`);
      } else {
        setUpvotes((p) => p + 1);
        setIsUpvoted(true);
        await ApiClient.post(`/interactions/${postId}/upvote`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isShared) {
        setShares((p) => Math.max(0, p - 1));
        setIsShared(false);
        await ApiClient.delete(`/interactions/${postId}/share`);
      } else {
        setShares((p) => p + 1);
        setIsShared(true);
        await ApiClient.post(`/interactions/${postId}/share`);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        <span>{commentsCount}</span>
      </button>

      <button
        onClick={toggleShare}
        title="Compartir"
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${isShared ? 'text-brand-400' : 'hover:text-brand-400'
          }`}
      >
        <PixelShare active={isShared} size={20} />
        <span>{shares}</span>
      </button>

      <button
        onClick={handleQuote}
        title="Citar"
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${initialIsQuoted ? 'text-brand-400' : 'hover:text-brand-400'
          }`}
      >
        <PixelQuote active={initialIsQuoted} size={20} />
        <span>{quotesCount}</span>
      </button>

      <button
        onClick={toggleUpvote}
        title="Me gusta"
        className={`flex items-center gap-2 rounded hover:bg-dark-border/40 transition-colors ${isUpvoted ? 'text-brand-400' : 'hover:text-brand-400'
          }`}
      >
        <PixelThumb active={isUpvoted} size={20} />
        <span>{upvotes}</span>
      </button>
    </div>
  );
};
