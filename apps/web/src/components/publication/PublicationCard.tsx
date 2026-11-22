import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClientContext } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationHeader } from './PublicationHeader.js';
import { PublicationMenu } from './PublicationMenu.js';
import { SharedPublicationCard } from './SharedPublicationCard.js';
import { AuthorThreadPreview } from './AuthorThreadPreview.js';
import { PublicationRowShell } from './PublicationRowShell.js';
import { PublicationReplyBanner } from './PublicationReplyBanner.js';
import { PublicationContentBlocks } from './PublicationContentBlocks.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { PublicationController } from '../../controllers/PublicationController.js';

interface Props {
  post: Publication;
  index?: number;
  hideBottomBorder?: boolean;
  hideThreadPreview?: boolean;
  onDelete?: (id: string) => void;
}

const PublicationCardBase: React.FC<Props> = ({
  post: rawPost, index, hideBottomBorder = false, hideThreadPreview = false, onDelete,
}) => {
  const post = usePublicationModel(rawPost) || rawPost;
  const navigate = useNavigate();
  const queryClient = useContext(QueryClientContext);
  const { user } = useAuthStore();
  const dialog = useDialogStore();
  const canDelete = Boolean(user && (user.id === post.author.id || ['admin', 'mod'].includes(user.role)));

  const handleDelete = async () => {
    if (!(await dialog.confirm({ title: 'Eliminar publicación', message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.', isDanger: true }))) return;
    try { await PublicationController.deletePublication(post.id, queryClient); onDelete?.(post.id); } catch (err: any) { dialog.alert(err.message, 'Error al eliminar'); }
  };

  const cardHandlers = useCardClickGuard(() => {
    PublicationCacheService.primePublication(post);
    navigate(`/publication/${post.id}`);
  });
  const deferClass = typeof index === 'number' && index >= 4 ? 'feed-card-deferred' : '';

  if (post.type === 'shared') {
    const sharedEl = <SharedPublicationCard post={post} canDelete={canDelete} onDelete={handleDelete} />;
    return deferClass ? <div className={deferClass}>{sharedEl}</div> : sharedEl;
  }

  const threadItems = hideThreadPreview ? [] : (post.author_thread_preview || []);
  const hasThread = threadItems.length > 0;
  const showLine = hasThread || (hideBottomBorder && !hideThreadPreview);
  const hideBorder = hasThread || hideBottomBorder;
  const rowClass = `${!hasThread && deferClass ? `${deferClass} ` : ''}p-3.5 sm:p-4 ${!hideBorder ? 'border-b border-dark-border ' : ''}${showLine ? 'pb-2 sm:pb-2 ' : ''}hover:bg-dark-card/40 transition-colors flex gap-3 cursor-pointer font-mono relative`;

  const articleEl = (
    <PublicationRowShell
      post={post}
      cardHandlers={cardHandlers}
      className={rowClass}
      connectBottom={showLine ? 'card' : false}
      replyBanner={post.type === 'reply' ? (
        <PublicationReplyBanner
          parentAuthorUsername={post.target_publication?.author?.username}
          parentPublicationId={post.parent_publication_id}
        />
      ) : undefined}
      header={(
        <PublicationHeader
          name={post.author.name}
          username={post.author.username}
          role={post.author.role}
          createdAt={post.created_at}
          rightSlot={<PublicationMenu postId={post.id} authorId={post.author.id} authorUsername={post.author.username} content={post.content} canDelete={canDelete} onDelete={handleDelete} />}
        />
      )}
    >
      <PublicationContentBlocks post={post} variant="feed" priority={index === 0} />
    </PublicationRowShell>
  );

  if (!hasThread) return articleEl;
  return (
    <div className={`${deferClass ? `${deferClass} ` : ''}border-b border-dark-border`}>
      {articleEl}
      <AuthorThreadPreview rootPostId={post.id} initialItems={threadItems} initialRemaining={post.author_thread_remaining_count || 0} />
    </div>
  );
};

export const PublicationCard = React.memo(PublicationCardBase);
