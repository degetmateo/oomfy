import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { SubthreadPreviewItem } from './SubthreadPreviewItem.js';
import { ApiClient } from '../../services/api.js';
import { useEntityRegistryStore } from '../../stores/entityRegistryStore.js';

interface Props {
  rootPostId: string;
  initialItems: Publication[];
  initialRemaining: number;
}

export const AuthorThreadPreview: React.FC<Props> = ({ rootPostId, initialItems, initialRemaining }) => {
  const [items, setItems] = useState<Publication[]>(initialItems);
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setRemaining(initialRemaining);
  }, [rootPostId, initialItems, initialRemaining]);

  const loadMore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoadingMore || remaining <= 0) return;
    setIsLoadingMore(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { items: Publication[]; remaining: number } }>(
        `/publications/${rootPostId}/subthread?mode=author&offset=${items.length}&limit=4`
      );
      const next = res?.data?.items || [];
      if (next.length > 0) {
        useEntityRegistryStore.getState().ingestPublications(next, Date.now());
        setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      }
      setRemaining(res?.data?.remaining ?? 0);
    } catch {
      /* ignore transient fetch failure so thread stays interactive */
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div data-no-card-nav="true" className="bg-dark-bg/20">
      {items.map((item, idx) => (
        <SubthreadPreviewItem key={item.id} item={item} connectTop connectBottom={idx < items.length - 1 || remaining > 0} />
      ))}
      {remaining > 0 && (
        <div className="px-3 sm:px-4 pb-3 pt-1 flex items-center gap-3 font-mono">
          <div className="w-12 flex justify-center flex-shrink-0" aria-hidden="true">
            <div className="h-6 border-l-2 border-dashed border-brand-500/60" />
          </div>
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="text-xs font-bold text-brand-400 hover:text-white hover:underline flex items-center gap-1.5 py-1 disabled:opacity-50"
          >
            {isLoadingMore && <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />}
            <span>Y {remaining} {remaining === 1 ? 'respuesta' : 'respuestas'} más...</span>
          </button>
        </div>
      )}
    </div>
  );
};
