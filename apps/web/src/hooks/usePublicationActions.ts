import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClientContext } from '@tanstack/react-query';
import { usePublicationModel } from './usePublicationModel.js';
import { PublicationController } from '../controllers/PublicationController.js';

export interface InteractionFallback {
  upvotes_count: number;
  is_upvoted: boolean;
  shares_count: number;
  is_shared: boolean;
  is_quoted: boolean;
  quotes_count: number;
  comments_count: number;
}

export function usePublicationActions(postId: string, fallback: InteractionFallback) {
  const navigate = useNavigate();
  const queryClient = useContext(QueryClientContext);
  const live = usePublicationModel(postId);

  const hasLive = Boolean(live);
  const isUpvoted = Boolean(live?.is_upvoted ?? fallback.is_upvoted);
  const rawUpvotes = hasLive ? (live?.upvotes_count ?? 0) : (fallback.upvotes_count || 0);
  const rawShares = hasLive ? (live?.shares_count ?? 0) : (fallback.shares_count || 0);
  const rawQuotes = hasLive ? (live?.quotes_count ?? 0) : (fallback.quotes_count || 0);

  const current: InteractionFallback = {
    upvotes_count: Math.max(0, rawUpvotes, isUpvoted ? 1 : 0),
    is_upvoted: isUpvoted,
    shares_count: Math.max(0, rawShares),
    is_shared: Boolean(live?.is_shared ?? fallback.is_shared),
    is_quoted: Boolean(live?.is_quoted ?? fallback.is_quoted),
    quotes_count: Math.max(0, rawQuotes),
    comments_count: Math.max(0, live?.comments_count || 0, fallback.comments_count || 0),
  };

  const toggleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    return PublicationController.toggleUpvote(postId, queryClient, () => navigate('/signin'));
  };

  const toggleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    return PublicationController.toggleShare(postId, queryClient, () => navigate('/signin'));
  };

  return { state: current, toggleUpvote, toggleShare };
}
