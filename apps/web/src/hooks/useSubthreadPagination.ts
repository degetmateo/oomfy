import { useState, useEffect, useCallback } from 'react';
import { Publication } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

export function useSubthreadPagination(
  rootId: string,
  mode: 'author' | 'subthread',
  initialItems: Publication[],
  initialRemaining: number,
  limit = 5
) {
  const [items, setItems] = useState<Publication[]>(initialItems);
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setRemaining(initialRemaining);
  }, [rootId, initialItems, initialRemaining]);

  const loadMore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoadingMore || remaining <= 0) return;
    setIsLoadingMore(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { items: Publication[]; remaining: number } }>(
        `/publications/${rootId}/subthread?mode=${mode}&offset=${items.length}&limit=${limit}`
      );
      const next = res?.data?.items || [];
      if (next.length > 0) {
        useEntityRegistryStore.getState().ingestPublications(next, Date.now());
        setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      }
      setRemaining(res?.data?.remaining ?? 0);
    } catch {
      /* ignore transient fetch failure so user can retry */
    } finally {
      setIsLoadingMore(false);
    }
  }, [rootId, mode, items.length, limit, isLoadingMore, remaining]);

  return { items, remaining, isLoadingMore, loadMore };
}
