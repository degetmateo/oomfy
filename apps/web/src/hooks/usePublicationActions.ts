import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const live = usePublicationModel(postId);

  const isUpvoted = Boolean(live?.is_upvoted ?? fallback.is_upvoted);
  const current: InteractionFallback = {
    upvotes_count: Math.max(0, live?.upvotes_count || 0, fallback.upvotes_count || 0, isUpvoted ? 1 : 0),
    is_upvoted: isUpvoted,
    shares_count: Math.max(0, live?.shares_count || 0, fallback.shares_count || 0),
    is_shared: Boolean(live?.is_shared ?? fallback.is_shared),
    is_quoted: Boolean(live?.is_quoted ?? fallback.is_quoted),
    quotes_count: Math.max(0, live?.quotes_count || 0, fallback.quotes_count || 0),
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
