import React from 'react';
import { PublicationCard } from './PublicationCard.js';
import { useCursorFeed } from '../../hooks/useCursorFeed.js';

interface Props {
  publicationId: string;
}

export const PublicationInteractionsQuotesTab: React.FC<Props> = ({ publicationId }) => {
  const { posts, isLoading, isFetchingNextPage, loadMoreRef } = useCursorFeed({
    queryKey: ['publication-quotes', publicationId],
    buildUrl: (olderId) => {
      const p = new URLSearchParams({ limit: '20' });
      if (olderId) p.append('older_id', olderId);
      return `/publications/${publicationId}/interactions/quotes?${p.toString()}`;
    },
    enabled: Boolean(publicationId),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando citas...</div>;
  }

  if (posts.length === 0) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">No hay citas todavía.</div>;
  }

  return (
    <div className="divide-y divide-dark-border font-mono">
      {posts.map((post) => (
        <PublicationCard key={post.id} post={post} />
      ))}
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más citas...</span>}
      </div>
    </div>
  );
};

