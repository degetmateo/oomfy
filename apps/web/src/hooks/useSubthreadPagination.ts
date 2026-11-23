import { useState, useEffect, useCallback, useRef } from 'react';
import { Publication } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

const EMPTY_ITEMS: Publication[] = [];

export function useSubthreadPagination(
  rootId: string,
  mode: 'author' | 'subthread',
  initialItems?: Publication[] | null,
  initialRemaining = 0,
  limit = 5
) {
  const normalizedInitial = initialItems && initialItems.length > 0 ? initialItems : EMPTY_ITEMS;
  const initialIdsKey = normalizedInitial.map((item) => item.id).join(',');
  const syncSignature = `${rootId}|${initialIdsKey}|${initialRemaining}`;

  const [items, setItems] = useState<Publication[]>(() => normalizedInitial);
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const latestInitialRef = useRef<Publication[]>(normalizedInitial);
  latestInitialRef.current = normalizedInitial;
  const syncedSignatureRef = useRef<string>(syncSignature);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (syncedSignatureRef.current === syncSignature) return;
    syncedSignatureRef.current = syncSignature;
    setItems(latestInitialRef.current);
    setRemaining(initialRemaining);
  }, [syncSignature, initialRemaining]);

  const loadMore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoadingMore || remaining <= 0) return;
    setIsLoadingMore(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { items: Publication[]; remaining: number } }>(
        `/publications/${rootId}/subthread?mode=${mode}&offset=${items.length}&limit=${limit}`
      );
      if (!mountedRef.current) return;
      const next = res?.data?.items || [];
      if (next.length > 0) {
        useEntityRegistryStore.getState().ingestPublications(next, Date.now());
        setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      }
      setRemaining(res?.data?.remaining ?? 0);
    } catch {
      /* ignore transient fetch failure so user can retry */
    } finally {
      if (mountedRef.current) setIsLoadingMore(false);
    }
  }, [rootId, mode, items.length, limit, isLoadingMore, remaining]);

  return { items, remaining, isLoadingMore, loadMore };
}
