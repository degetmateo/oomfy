import { QueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useToastStore } from '../stores/toastStore.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { publicationInteractionCache } from '../models/PublicationInteractionCache.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { emitPublicationInteraction } from './publicationSocketHelper.js';

export class PublicationController {
  public static async toggleUpvote(postId: string, queryClient: QueryClient | null | undefined, onAuthRequired: () => void): Promise<void> {
    if (!useAuthStore.getState().isAuthenticated) { onAuthRequired(); return; }
    const current = publicationIdentityMap.get(postId);
    const wasUpvoted = Boolean(current?.is_upvoted);
    const prevCount = Math.max(0, current?.upvotes_count || 0);
    const optimistic = { is_upvoted: !wasUpvoted, upvotes_count: Math.max(0, prevCount + (wasUpvoted ? -1 : 1)) };

    publicationIdentityMap.setInFlight(postId, 1);
    PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, ...optimistic }));
    try {
      const res = await emitPublicationInteraction<{ upvoted: boolean; upvotes_count: number }>(
        'publication:upvote',
        { postId, action: wasUpvoted ? 'remove' : 'add' },
        () => wasUpvoted
          ? ApiClient.delete<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`)
          : ApiClient.post<{ upvoted: boolean; upvotes_count: number }>(`/interactions/${postId}/upvote`)
      );
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

  public static async toggleShare(postId: string, queryClient: QueryClient | null | undefined, onAuthRequired: () => void): Promise<void> {
    if (!useAuthStore.getState().isAuthenticated) { onAuthRequired(); return; }
    const current = publicationIdentityMap.get(postId);
    const wasShared = Boolean(current?.is_shared);
    const prevCount = Math.max(0, current?.shares_count || 0);
    const optimistic = { is_shared: !wasShared, shares_count: Math.max(0, prevCount + (wasShared ? -1 : 1)) };

    publicationIdentityMap.setInFlight(postId, 1);
    PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, ...optimistic }));
    try {
      const res = await emitPublicationInteraction<{ shared: boolean; shares_count: number }>(
        'publication:share',
        { postId, action: wasShared ? 'remove' : 'add' },
        () => wasShared
          ? ApiClient.delete<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`)
          : ApiClient.post<{ shared: boolean; shares_count: number }>(`/interactions/${postId}/share`)
      );
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

  public static async toggleBookmark(
    postId: string,
    queryClient: QueryClient | null | undefined,
    onAuthRequired: () => void,
    fallbackIsBookmarked = false
  ): Promise<boolean> {
    if (!useAuthStore.getState().isAuthenticated) {
      onAuthRequired();
      return fallbackIsBookmarked;
    }
    const current = publicationIdentityMap.get(postId);
    const wasBookmarked = current?.is_bookmarked ?? fallbackIsBookmarked;
    const nextBookmarked = !wasBookmarked;
    const showToast = useToastStore.getState().showToast;

    publicationIdentityMap.setInFlight(postId, 1);
    publicationInteractionCache.record(postId, { is_bookmarked: nextBookmarked });
    PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, is_bookmarked: nextBookmarked }));
    try {
      if (wasBookmarked) {
        await ApiClient.delete(`/bookmarks/${postId}`);
      } else {
        await ApiClient.post('/bookmarks', { publication_id: postId });
      }
      queryClient?.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient?.invalidateQueries({ queryKey: ['bookmark-folders'] });
      showToast(nextBookmarked ? 'Publicación guardada' : 'Publicación quitada de guardados', 'success');
      return nextBookmarked;
    } catch (err: any) {
      publicationInteractionCache.record(postId, { is_bookmarked: wasBookmarked });
      PublicationCacheService.applyPatch(queryClient, postId, (p) => ({ ...p, is_bookmarked: wasBookmarked }));
      showToast(err?.message || 'No se pudo actualizar guardados', 'error');
      return wasBookmarked;
    } finally {
      publicationIdentityMap.setInFlight(postId, -1);
    }
  }

  public static applyRealtimeInteraction(
    data: { postId?: string; upvotes_count?: number; shares_count?: number },
    queryClient: QueryClient | null | undefined
  ): void {
    if (!data?.postId) return;
    PublicationCacheService.applyPatch(queryClient, data.postId, (p) => ({
      ...p,
      ...(typeof data.upvotes_count === 'number' ? { upvotes_count: Math.max(0, data.upvotes_count) } : {}),
      ...(typeof data.shares_count === 'number' ? { shares_count: Math.max(0, data.shares_count) } : {}),
    }));
  }

  public static async deletePublication(postId: string, queryClient?: QueryClient | null): Promise<void> {
    const deleted = publicationIdentityMap.get(postId);
    await ApiClient.delete(`/publications/${postId}`);
    if (deleted?.type === 'quote' && deleted.parent_publication_id) {
      PublicationCacheService.applyPatch(queryClient, deleted.parent_publication_id, (p) => ({
        ...p,
        quotes_count: Math.max(0, (p.quotes_count || 1) - 1),
        is_quoted: false,
      }));
    }
    publicationIdentityMap.remove(postId);
    if (queryClient) PublicationCacheService.invalidatePublicationLists(queryClient);
  }
}
