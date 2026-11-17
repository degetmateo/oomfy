import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from './PublicationCard.js';
import { SubthreadPreviewItem } from './SubthreadPreviewItem.js';
import { ApiClient } from '../../services/api.js';
import { useEntityRegistryStore } from '../../stores/entityRegistryStore.js';

interface Props {
  reply: Publication;
  rootAuthorId: string;
  rootAuthorUsername: string;
  onDelete?: (id: string) => void;
}

export const ReplyThreadGroup: React.FC<Props> = ({ reply, rootAuthorId, rootAuthorUsername, onDelete }) => {
  const [items, setItems] = useState<Publication[]>(reply.subthread_preview || []);
  const [remaining, setRemaining] = useState<number>(reply.subthread_remaining_count || 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setItems(reply.subthread_preview || []);
    setRemaining(reply.subthread_remaining_count || 0);
  }, [reply.id, reply.subthread_preview, reply.subthread_remaining_count]);

  const loadMore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoadingMore || remaining <= 0) return;
    setIsLoadingMore(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { items: Publication[]; remaining: number } }>(
        `/publications/${reply.id}/subthread?mode=subthread&offset=${items.length}&limit=5`
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
  };

  const hasSubthread = items.length > 0;
  const showAuthorIndicator = Boolean(reply.has_author_reply && reply.author.id !== rootAuthorId);

  return (
    <div className="border-b border-dark-border">
      {showAuthorIndicator && (
        <div className="px-4 pt-2 flex items-center gap-1.5 text-[11px] font-mono text-brand-400 font-bold">
          <MessageSquare className="w-3 h-3" aria-hidden="true" />
          <span>Respondido por @{rootAuthorUsername} en este hilo</span>
        </div>
      )}
      <PublicationCard post={reply} onDelete={onDelete} hideBottomBorder={hasSubthread} />
      {hasSubthread && (
        <section aria-label={`Subhilo de respuestas de @${reply.author.username}`} className="bg-dark-bg/25">
          {items.map((sub, idx) => (
            <SubthreadPreviewItem
              key={sub.id}
              item={sub}
              connectTop
              connectBottom={idx < items.length - 1 || remaining > 0}
              isRootAuthor={sub.author.id === rootAuthorId}
              avatarSizeClass="w-8 h-8"
            />
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
                className="text-xs font-bold text-brand-400 hover:text-white bg-dark-card/70 border border-dark-border hover:border-brand-500 px-3 py-1.5 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isLoadingMore && <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />}
                <span>Mostrar más respuestas (Y {remaining} {remaining === 1 ? 'respuesta' : 'respuestas'} más...)</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
