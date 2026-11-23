import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from './PublicationCard.js';
import { SubthreadPreviewItem } from './SubthreadPreviewItem.js';
import { SubthreadMoreRow } from './SubthreadMoreRow.js';
import { useSubthreadPagination } from '../../hooks/useSubthreadPagination.js';

interface Props {
  reply: Publication;
  rootAuthorId: string;
  rootAuthorUsername: string;
  onDelete?: (id: string) => void;
}

const isChildOf = (child?: Publication | null, parent?: Publication | null): boolean => {
  if (!child || !parent?.id) return false;
  const pId = child.parent_publication_id || (child as any).target_publication_id || child.target_publication?.id;
  return Boolean(pId && String(pId).toLowerCase() === String(parent.id).toLowerCase());
};

export const ReplyThreadGroup: React.FC<Props> = ({ reply, rootAuthorId, rootAuthorUsername, onDelete }) => {
  const { items, remaining, isLoadingMore, loadMore } = useSubthreadPagination(
    reply.id, 'subthread', reply.subthread_preview, reply.subthread_remaining_count || 0, 5
  );

  const hasSubthread = items.length > 0;
  const showAuthorIndicator = Boolean(reply.has_author_reply && reply.author.id !== rootAuthorId);

  return (
    <div className="border-b border-dark-border">
      {showAuthorIndicator && (
        <div className="px-4 pt-2.5 pb-0.5 flex items-center gap-1.5 text-xs font-mono text-brand-400 font-bold">
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Respondido por @{rootAuthorUsername} en este hilo</span>
        </div>
      )}
      <PublicationCard post={reply} onDelete={onDelete} hideBottomBorder={hasSubthread && isChildOf(items[0], reply)} />
      {hasSubthread && (
        <section aria-label={`Subhilo de respuestas de @${reply.author.username}`} className="bg-dark-bg/25">
          {items.map((sub, idx) => (
            <SubthreadPreviewItem
              key={sub.id}
              item={sub}
              connectTop={idx === 0 ? isChildOf(sub, reply) : isChildOf(sub, items[idx - 1])}
              connectBottom={idx < items.length - 1 ? isChildOf(items[idx + 1], sub) : remaining > 0}
              isRootAuthor={sub.author.id === rootAuthorId}
              avatarSizeClass="w-8 h-8"
            />
          ))}
          {remaining > 0 && (
            <SubthreadMoreRow
              label="Mostrar más respuestas"
              isLoading={isLoadingMore}
              onClick={loadMore}
              buttonClassName="text-xs font-bold text-brand-400 hover:text-white bg-dark-card/70 border border-dark-border hover:border-brand-500 px-3 py-1.5 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            />
          )}
        </section>
      )}
    </div>
  );
};
