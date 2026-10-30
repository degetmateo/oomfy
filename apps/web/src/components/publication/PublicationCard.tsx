import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Trash2, Copy, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { PublicationActions } from './PublicationActions.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ApiClient } from '../../services/api.js';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const canDelete = Boolean(
    user && (user.id === post.author.id || ['admin', 'mod'].includes(user.role))
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const confirmed = await dialog.confirm({
      title: 'Eliminar publicación',
      message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await ApiClient.delete(`/publications/${post.id}`);
      onDelete?.(post.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['explore-posts'] });
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al eliminar');
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/publication/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsMenuOpen(false);
    }, 1200);
  };

  const handleQuoteClick = () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    openPostModal(post);
  };

  return (
    <article
      onClick={() => navigate(`/publication/${post.id}`)}
      className="p-3 sm:p-4 border-b border-dark-border hover:bg-dark-card/40 transition-colors flex gap-3 cursor-pointer font-mono relative"
    >
      <div
        onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }}
        className="flex-shrink-0 cursor-pointer"
      >
        <PixelAvatar
          src={post.author.icon_url}
          username={post.author.username}
          sizeClass="w-10 h-10"
        />
      </div>

      <div className="flex-1 min-w-0">
        {post.type === 'shared' && (
          <div className="flex items-center gap-1.5 text-xs text-dark-muted mb-1 font-mono">
            <span>🔁</span>
            <span>Reposteado</span>
          </div>
        )}

        {post.type === 'reply' && (
          <div className="text-xs text-dark-muted mb-1 font-mono flex items-center gap-1">
            <span>En respuesta a</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (post.target_publication?.author.username) {
                  navigate(`/${post.target_publication.author.username}`);
                } else if (post.parent_publication_id) {
                  navigate(`/publication/${post.parent_publication_id}`);
                }
              }}
              className="text-brand-400 font-bold hover:underline"
            >
              @{post.target_publication?.author.username || 'usuario'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }}
              className="font-bold text-white hover:text-brand-400 truncate text-sm"
            >
              {post.author.name}
            </span>
            <PixelBadge role={post.author.role} />
            <span className="text-dark-muted text-xs truncate">@{post.author.username}</span>
            <span className="text-dark-muted text-xs">· {new Date(post.created_at).toLocaleDateString()}</span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1 text-dark-muted hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-30 w-44 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs"
              >
                <button
                  onClick={handleCopyLink}
                  className="w-full px-3 py-2 text-left hover:bg-dark-card flex items-center gap-2 text-dark-text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
                </button>
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left hover:bg-red-950/40 text-red-400 flex items-center gap-2 border-t border-dark-border/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {post.content && (
          <FormattedText
            text={post.content}
            className="mt-1.5 text-sm text-dark-text whitespace-pre-line leading-relaxed font-sans block"
          />
        )}

        <MediaGrid images={post.images || []} />
        <LinkPreviewCard
          embeds={post.embeds}
          targetPublication={(post.type === 'quote' || post.type === 'shared') ? post.target_publication : undefined}
        />

        <PublicationActions
          postId={post.id}
          initialUpvotes={post.upvotes_count || 0}
          initialIsUpvoted={post.is_upvoted}
          initialShares={post.shares_count || 0}
          initialIsShared={post.is_shared}
          quotesCount={post.quotes_count || 0}
          commentsCount={post.comments_count || 0}
          onCommentClick={() => navigate(`/publication/${post.id}`)}
          onQuoteClick={handleQuoteClick}
        />
      </div>
    </article>
  );
};
