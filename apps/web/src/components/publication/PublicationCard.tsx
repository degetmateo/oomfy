import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PublicationHeader } from './PublicationHeader.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { PublicationActions } from './PublicationActions.js';
import { PublicationMenu } from './PublicationMenu.js';
import { SharedPublicationCard } from './SharedPublicationCard.js';
import { AuthorThreadPreview } from './AuthorThreadPreview.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { PublicationController } from '../../controllers/PublicationController.js';

interface Props {
  post: Publication;
  index?: number;
  hideBottomBorder?: boolean;
  onDelete?: (id: string) => void;
}

const PublicationCardBase: React.FC<Props> = ({ post: rawPost, index, hideBottomBorder = false, onDelete }) => {
  const post = usePublicationModel(rawPost) || rawPost;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();
  const canDelete = Boolean(user && (user.id === post.author.id || ['admin', 'mod'].includes(user.role)));

  const handleDelete = async () => {
    if (!(await dialog.confirm({ title: 'Eliminar publicación', message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.', isDanger: true }))) return;
    try { await PublicationController.deletePublication(post.id, queryClient); onDelete?.(post.id); } catch (err: any) { dialog.alert(err.message, 'Error al eliminar'); }
  };

  const cardHandlers = useCardClickGuard(() => { PublicationCacheService.primePublication(post); navigate(`/publication/${post.id}`); });
  const deferClass = typeof index === 'number' && index >= 4 ? 'feed-card-deferred' : '';
  if (post.type === 'shared') {
    const sharedEl = <SharedPublicationCard post={post} canDelete={canDelete} onDelete={handleDelete} />;
    return deferClass ? <div className={deferClass}>{sharedEl}</div> : sharedEl;
  }

  const threadItems = post.author_thread_preview || [];
  const hasThread = threadItems.length > 0;
  const showLine = hasThread || hideBottomBorder;
  const articleEl = (
    <article {...cardHandlers} className={`${!hasThread && deferClass ? `${deferClass} ` : ''}p-3 sm:p-4 ${!hasThread && !hideBottomBorder ? 'border-b border-dark-border ' : 'pb-2 '}hover:bg-dark-card/40 transition-colors flex gap-3 cursor-pointer font-mono relative`}>
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" data-no-card-nav="true" onClick={(e) => { e.stopPropagation(); navigate(`/publication/${post.id}`); }}>
        <PixelAvatar src={post.author.icon_url} username={post.author.username} sizeClass="w-12 h-12" onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }} />
        {showLine && <div className="w-0.5 flex-1 bg-dark-border mt-1.5 -mb-2" aria-hidden="true" />}
      </div>
      <div className="flex-1 min-w-0">
        {post.type === 'reply' && (
          <div className="text-xs text-dark-muted mb-1 font-mono flex items-center gap-1">
            <span>En respuesta a</span>
            <span onClick={(e) => {
              e.stopPropagation();
              if (post.target_publication?.author.username) navigate(`/${post.target_publication.author.username}`);
              else if (post.parent_publication_id) navigate(`/publication/${post.parent_publication_id}`);
            }} className="text-brand-400 font-bold hover:underline cursor-pointer">
              @{post.target_publication?.author.username || 'usuario'}
            </span>
          </div>
        )}
        <PublicationHeader
          name={post.author.name} username={post.author.username} role={post.author.role} createdAt={post.created_at}
          rightSlot={<PublicationMenu postId={post.id} authorId={post.author.id} authorUsername={post.author.username} content={post.content} canDelete={canDelete} onDelete={handleDelete} />}
        />
        {post.content && <FormattedText text={post.content} authorId={post.author.id} className="mt-1.5 text-sm text-dark-text whitespace-pre-line leading-relaxed font-sans block" />}
        <MediaGrid images={post.images || []} priority={index === 0} />
        <LinkPreviewCard embeds={post.embeds} targetPublication={post.type === 'quote' ? post.target_publication : undefined} />
        <PublicationActions
          postId={post.id} initialUpvotes={Math.max(0, post.upvotes_count || 0, post.is_upvoted ? 1 : 0)} initialIsUpvoted={post.is_upvoted}
          initialShares={Math.max(0, post.shares_count || 0)} initialIsShared={post.is_shared} initialIsQuoted={post.is_quoted}
          quotesCount={Math.max(0, post.quotes_count || 0)} commentsCount={Math.max(0, post.comments_count || 0)}
          onCommentClick={() => navigate(`/publication/${post.id}`)} onQuoteClick={() => (isAuthenticated ? openPostModal(post) : navigate('/signin'))}
        />
      </div>
    </article>
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
