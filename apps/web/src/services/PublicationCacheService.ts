import { QueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';

export class PublicationCacheService {
  private static previewMap = new Map<string, Publication>();

  public static findInCache(queryClient: QueryClient, id?: string): Publication | undefined {
    if (!id) return undefined;

    // 1. Check existing publication detail cache
    const detail = queryClient.getQueryData<{ publication?: Publication }>(['publication', id]);
    if (detail?.publication) return detail.publication;

    // 2. Check preview map
    const preview = this.previewMap.get(id);
    if (preview) return preview;

    // 3. Check feed cache (infinite query)
    const feed = queryClient.getQueryData<{ pages?: { data: Publication[] }[]; data?: Publication[] }>(['feed']);
    if (feed?.pages) {
      for (const page of feed.pages) {
        const found = page.data?.find((p) => p.id === id);
        if (found) return found;
      }
    } else if (feed?.data) {
      const found = feed.data.find((p) => p.id === id);
      if (found) return found;
    }

    // 4. Check user-posts cache across profile views
    const queries = queryClient.getQueryCache().findAll({ queryKey: ['user-posts'] });
    for (const q of queries) {
      const qData = q.state.data as { pages?: { data: Publication[] }[]; data?: Publication[] } | undefined;
      if (qData?.pages) {
        for (const page of qData.pages) {
          const found = page.data?.find((p) => p.id === id);
          if (found) return found;
        }
      }
    }

    return undefined;
  }

  public static getPlaceholderDetailData(
    queryClient: QueryClient,
    id?: string
  ): { publication: Publication; ancestors: Publication[]; replies: Publication[]; has_more_ancestors: boolean; total_ancestors: number } | undefined {
    const post = this.findInCache(queryClient, id);
    if (!post) return undefined;
    return {
      publication: post,
      ancestors: post.target_publication ? [post.target_publication] : [],
      total_ancestors: post.target_publication ? 1 : 0,
      has_more_ancestors: false,
      replies: [],
    };
  }

  // Alias for backward compatibility
  public static getInitialDetailData(queryClient: QueryClient, id?: string) {
    return this.getPlaceholderDetailData(queryClient, id);
  }

  public static primePublication(_queryClient: QueryClient, post: Publication): void {
    if (!post?.id) return;
    this.previewMap.set(post.id, post);
  }

  public static clearPreview(id?: string): void {
    if (id) this.previewMap.delete(id);
    else this.previewMap.clear();
  }
}
