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
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ApiClient } from '../../services/api.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';

interface Props {
  post: Publication;
  onDelete?: (id: string) => void;
}

export const PublicationCard: React.FC<Props> = ({ post, onDelete }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();

  const canDelete = Boolean(user && (user.id === post.author.id || ['admin', 'mod'].includes(user.role)));

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: 'Eliminar publicación', message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.', isDanger: true,
    });
    if (!confirmed) return;
    try {
      await ApiClient.delete(`/publications/${post.id}`);
      onDelete?.(post.id);
      ['feed', 'user-posts', 'explore-posts'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (err: any) { dialog.alert(err.message, 'Error al eliminar'); }
  };

  const handleQuoteClick = () => (isAuthenticated ? openPostModal(post) : navigate('/signin'));
  const cardHandlers = useCardClickGuard(() => { PublicationCacheService.primePublication(queryClient, post); navigate(`/publication/${post.id}`); });

  if (post.type === 'shared') return <SharedPublicationCard post={post} canDelete={canDelete} onDelete={handleDelete} />;

  return (
    <article {...cardHandlers} className="p-3 sm:p-4 border-b border-dark-border hover:bg-dark-card/40 transition-colors flex gap-3 cursor-pointer font-mono relative">
      <div className="flex-shrink-0 cursor-pointer" data-no-card-nav="true">
        <PixelAvatar src={post.author.icon_url} username={post.author.username} sizeClass="w-12 h-12" onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }} />
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

        {post.content && <FormattedText text={post.content} className="mt-1.5 text-sm text-dark-text whitespace-pre-line leading-relaxed font-sans block" />}
        <MediaGrid images={post.images || []} />
        <LinkPreviewCard embeds={post.embeds} targetPublication={post.type === 'quote' ? post.target_publication : undefined} />
        <PublicationActions
          postId={post.id} initialUpvotes={post.upvotes_count || 0} initialIsUpvoted={post.is_upvoted}
          initialShares={post.shares_count || 0} initialIsShared={post.is_shared} initialIsQuoted={post.is_quoted}
          quotesCount={post.quotes_count || 0} commentsCount={post.comments_count || 0}
          onCommentClick={() => navigate(`/publication/${post.id}`)} onQuoteClick={handleQuoteClick}
        />
      </div>
    </article>
  );
};
