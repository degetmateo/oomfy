import { QueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';

export class PublicationController {
  public static async toggleUpvote(postId: string, queryClient: QueryClient, onAuthRequired: () => void): Promise<void> {
    if (!useAuthStore.getState().isAuthenticated) { onAuthRequired(); return; }
    const current = publicationIdentityMap.get(postId);
    const wasUpvoted = Boolean(current?.is_upvoted);
    const prevCount = Math.max(0, current?.upvotes_count || 0);
    const optimistic = { is_upvoted: !wasUpvoted, upvotes_count: Math.max(0, prevCount + (wasUpvoted ? -1 : 1)) };

    publicationIdentityMap.setInFlight(postId, 1);
    PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, ...optimistic }));
    try {
      const res = wasUpvoted
        ? await ApiClient.delete<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`)
        : await ApiClient.post<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`);
      if (typeof res?.upvoted === 'boolean') {
        PublicationCacheService.applyPatch(queryClient, postId, (p) => ({
          ...p, is_upvoted: res.upvoted, upvotes_count: Math.max(0, res.upvotes_count ?? optimistic.upvotes_count),
        }));
      }
    } catch {
      PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, is_upvoted: wasUpvoted, upvotes_count: prevCount }));
    } finally {
      publicationIdentityMap.setInFlight(postId, -1);
    }
  }

  public static async toggleShare(postId: string, queryClient: QueryClient, onAuthRequired: () => void): Promise<void> {
    if (!useAuthStore.getState().isAuthenticated) { onAuthRequired(); return; }
    const current = publicationIdentityMap.get(postId);
    const wasShared = Boolean(current?.is_shared);
    const prevCount = Math.max(0, current?.shares_count || 0);
    const optimistic = { is_shared: !wasShared, shares_count: Math.max(0, prevCount + (wasShared ? -1 : 1)) };

    publicationIdentityMap.setInFlight(postId, 1);
    PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, ...optimistic }));
    try {
      const res = wasShared
        ? await ApiClient.delete<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`)
        : await ApiClient.post<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`);
      if (typeof res?.shared === 'boolean') {
        PublicationCacheService.applyPatch(queryClient, postId, (p) => ({
          ...p, is_shared: res.shared, shares_count: Math.max(0, res.shares_count ?? optimistic.shares_count),
        }));
      }
    } catch {
      PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, is_shared: wasShared, shares_count: prevCount }));
    } finally {
      publicationIdentityMap.setInFlight(postId, -1);
    }
  }

  public static async deletePublication(postId: string, queryClient: QueryClient): Promise<void> {
    await ApiClient.delete(`/publications/${postId}`);
    PublicationCacheService.invalidatePublicationLists(queryClient);
  }
}

