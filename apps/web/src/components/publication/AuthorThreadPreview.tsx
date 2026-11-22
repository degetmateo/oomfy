import React from 'react';
import { Publication } from '@oomfy/shared';
import { SubthreadPreviewItem } from './SubthreadPreviewItem.js';
import { SubthreadMoreRow } from './SubthreadMoreRow.js';
import { useSubthreadPagination } from '../../hooks/useSubthreadPagination.js';

interface Props {
  rootPostId: string;
  initialItems: Publication[];
  initialRemaining: number;
}

export const AuthorThreadPreview: React.FC<Props> = ({ rootPostId, initialItems, initialRemaining }) => {
  const { items, remaining, isLoadingMore, loadMore } = useSubthreadPagination(
    rootPostId, 'author', initialItems, initialRemaining, 4
  );

  if (items.length === 0) return null;

  return (
    <div data-no-card-nav="true" className="bg-dark-bg/20">
      {items.map((item, idx) => (
        <SubthreadPreviewItem key={item.id} item={item} connectTop connectBottom={idx < items.length - 1 || remaining > 0} />
      ))}
      {remaining > 0 && (
        <SubthreadMoreRow
          label={`Y ${remaining} ${remaining === 1 ? 'respuesta' : 'respuestas'} más...`}
          isLoading={isLoadingMore}
          onClick={loadMore}
          buttonClassName="text-xs font-bold text-brand-400 hover:text-white hover:underline flex items-center gap-1.5 py-1 disabled:opacity-50"
        />
      )}
    </div>
  );
};
