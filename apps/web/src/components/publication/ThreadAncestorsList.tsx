import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowUp, RefreshCw } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { ThreadAncestorCard } from './ThreadAncestorCard.js';
import { ApiClient } from '../../services/api.js';
import { useViewActive } from '../../contexts/ViewActivityContext.js';

interface Props {
  publicationId: string;
  initialAncestors: Publication[];
  hasMoreInitial?: boolean;
  totalAncestors?: number;
}

export const ThreadAncestorsList: React.FC<Props> = ({
  publicationId, initialAncestors, hasMoreInitial = false, totalAncestors = 0,
}) => {
  const isViewActive = useViewActive();
  const [earlierAncestors, setEarlierAncestors] = useState<Publication[]>([]);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [remaining, setRemaining] = useState<number>(Math.max(0, totalAncestors - initialAncestors.length));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEarlierAncestors([]);
  }, [publicationId]);

  const initialCount = initialAncestors.length;
  useEffect(() => {
    setHasMore(hasMoreInitial);
    setRemaining(Math.max(0, totalAncestors - initialCount));
  }, [publicationId, initialCount, hasMoreInitial, totalAncestors]);

  const allAncestors = useMemo(
    () => (earlierAncestors.length === 0 ? initialAncestors : [...earlierAncestors, ...initialAncestors]),
    [earlierAncestors, initialAncestors]
  );
  const firstAncestorId = allAncestors[0]?.id || '';

  const loadEarlier = useCallback(async () => {
    if (isLoadingMore || !hasMore || !firstAncestorId) return;
    setIsLoadingMore(true);
    const prevScrollHeight = document.documentElement.scrollHeight;
    try {
      const res = await ApiClient.get<any>(`/publications/${publicationId}/ancestors?before_id=${firstAncestorId}&limit=4`);
      const data = res.data;
      if (data?.ancestors?.length > 0) {
        setEarlierAncestors((prev) => [...data.ancestors, ...prev]);
        setHasMore(Boolean(data.has_more));
        setRemaining(data.remaining || 0);
        requestAnimationFrame(() => {
          window.scrollBy({ top: document.documentElement.scrollHeight - prevScrollHeight, behavior: 'instant' as ScrollBehavior });
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error al cargar ancestros del hilo:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [publicationId, isLoadingMore, hasMore, firstAncestorId]);

  useEffect(() => {
    if (!isViewActive || !hasMore || isLoadingMore || !firstAncestorId) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadEarlier(); },
      { threshold: 0.1, rootMargin: '100px 0px 0px 0px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isViewActive, hasMore, isLoadingMore, firstAncestorId, loadEarlier]);

  if (allAncestors.length === 0 && !hasMore) return null;

  return (
    <div className="border-b border-dark-border/60 bg-dark-card/10">
      {hasMore && (
        <div ref={sentinelRef} className="p-2 border-b border-dark-border/40 bg-dark-bg/40 select-none">
          <button
            type="button"
            onClick={loadEarlier}
            disabled={isLoadingMore}
            className="w-full py-2 px-3 text-xs font-mono text-brand-400 hover:text-white bg-dark-bg/60 border border-dark-border hover:border-brand-500 flex items-center justify-center gap-2 pixel-button transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Cargando hilo anterior...</span></>
            ) : (
              <><ArrowUp className="w-3.5 h-3.5" /><span>Mostrar publicaciones anteriores del hilo {remaining > 0 ? `(quedan ${remaining})` : ''}</span></>
            )}
          </button>
        </div>
      )}
      {allAncestors.map((anc, idx) => (
        <ThreadAncestorCard key={anc.id} post={anc} showTopLine={idx > 0} />
      ))}
    </div>
  );
};
