import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { ApiClient } from '../services/api.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';

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
  const { isAuthenticated } = useAuthStore();
  const live = useEntityRegistryStore((s) => s.publications[postId]);
  const { setPubInFlight } = useEntityRegistryStore();

  const current: InteractionFallback = {
    upvotes_count: live?.upvotes_count ?? fallback.upvotes_count,
    is_upvoted: live?.is_upvoted ?? fallback.is_upvoted,
    shares_count: live?.shares_count ?? fallback.shares_count,
    is_shared: live?.is_shared ?? fallback.is_shared,
    is_quoted: live?.is_quoted ?? fallback.is_quoted,
    quotes_count: live?.quotes_count ?? fallback.quotes_count,
    comments_count: live?.comments_count ?? fallback.comments_count,
  };

  const applyPatch = (updater: (p: Publication) => Publication) => {
    PublicationCacheService.applyPatch(queryClient, postId, updater, { id: postId, ...current } as Publication);
  };

  const toggleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/signin'); return; }
    const wasUpvoted = Boolean(current.is_upvoted);
    const prevCount = current.upvotes_count;
    const optimistic = { is_upvoted: !wasUpvoted, upvotes_count: Math.max(0, prevCount + (wasUpvoted ? -1 : 1)) };

    setPubInFlight(postId, 1);
    applyPatch((p) => ({ ...p, ...optimistic }));
    try {
      const res = wasUpvoted
        ? await ApiClient.delete<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`)
        : await ApiClient.post<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`);
      if (typeof res?.upvoted === 'boolean') {
        applyPatch((p) => ({ ...p, is_upvoted: res.upvoted, upvotes_count: res.upvotes_count ?? optimistic.upvotes_count }));
      }
    } catch {
      applyPatch((p) => ({ ...p, is_upvoted: wasUpvoted, upvotes_count: prevCount }));
    } finally {
      setPubInFlight(postId, -1);
    }
  };

  const toggleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/signin'); return; }
    const wasShared = Boolean(current.is_shared);
    const prevCount = current.shares_count;
    const optimistic = { is_shared: !wasShared, shares_count: Math.max(0, prevCount + (wasShared ? -1 : 1)) };

    setPubInFlight(postId, 1);
    applyPatch((p) => ({ ...p, ...optimistic }));
    try {
      const res = wasShared
        ? await ApiClient.delete<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`)
        : await ApiClient.post<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`);
      if (typeof res?.shared === 'boolean') {
        applyPatch((p) => ({ ...p, is_shared: res.shared, shares_count: res.shares_count ?? optimistic.shares_count }));
      }
    } catch {
      applyPatch((p) => ({ ...p, is_shared: wasShared, shares_count: prevCount }));
    } finally {
      setPubInFlight(postId, -1);
    }
  };

  return { state: current, toggleUpvote, toggleShare };
}
