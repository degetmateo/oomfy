import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Trash2, Copy, Check } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { ApiClient } from '../services/api.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ThreadAncestorCard } from '../components/publication/ThreadAncestorCard.js';
import { PublicationActions } from '../components/publication/PublicationActions.js';
import { MediaGrid } from '../components/publication/MediaGrid.js';
import { LinkPreviewCard } from '../components/publication/LinkPreviewCard.js';
import { PixelBadge } from '../components/icons/PixelBadge.js';
import { PixelShare } from '../components/icons/PixelShare.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';
import { FormattedText } from '../components/common/FormattedText.js';
import { ReplyComposer } from '../components/publication/ReplyComposer.js';
import { useAuthStore } from '../stores/authStore.js';
import { useUIStore } from '../stores/uiStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { Publication } from '@oomfy/shared';

export const PublicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const res = await ApiClient.get<any>(`/publications/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const replyMutation = useMutation({
    mutationFn: (formData: FormData) => ApiClient.post('/publications', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-dark-muted font-mono">Cargando publicación...</div>;
  if (error || !data?.publication) return <div className="p-8 text-center text-red-400 font-mono">Publicación no encontrada.</div>;

  const publication: Publication = data.publication;
  const ancestors: Publication[] = data.ancestors || [];
  const replies: Publication[] = data.replies || data.thread || [];

  const canDelete = Boolean(
    user && (user.id === publication.author.id || ['admin', 'mod'].includes(user.role))
  );

  const handleCopyLink = () => {
    const url = `${window.location.origin}/publication/${publication.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsMenuOpen(false);
    }, 1200);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    const confirmed = await dialog.confirm({
      title: 'Eliminar publicación',
      message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await ApiClient.delete(`/publications/${publication.id}`);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      navigate(-1);
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al eliminar');
    }
  };

  return (
    <div className="font-mono">
      <Header title="Publicación" />

      {ancestors.length > 0 && (
        <div className="border-b border-dark-border/60 bg-dark-card/10">
          {ancestors.map((anc) => (
            <ThreadAncestorCard key={anc.id} post={anc} />
          ))}
        </div>
      )}

      <article className="p-4 border-b border-dark-border bg-dark-card/20 relative">
        {publication.type === 'shared' && (
          <div className="flex items-center gap-1.5 text-xs text-dark-muted mb-2 font-mono">
            <PixelShare active size={16} />
            <span>Compartido por @{publication.author.username}</span>
          </div>
        )}

        {publication.type === 'reply' && (
          <div className="text-xs text-dark-muted mb-2 font-mono flex items-center gap-1">
            <span>En respuesta a</span>
            <span
              onClick={() => {
                if (publication.target_publication?.author.username) {
                  navigate(`/${publication.target_publication.author.username}`);
                } else if (publication.parent_publication_id) {
                  navigate(`/publication/${publication.parent_publication_id}`);
                }
              }}
              className="text-brand-400 font-bold hover:underline cursor-pointer"
            >
              @{publication.target_publication?.author.username || 'usuario'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              onClick={() => navigate(`/${publication.author.username}`)}
              className="cursor-pointer"
            >
              <PixelAvatar
                src={publication.author.icon_url}
                username={publication.author.username}
                sizeClass="w-14 h-14"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span onClick={() => navigate(`/${publication.author.username}`)} className="font-bold text-white hover:text-brand-400 cursor-pointer">
                  {publication.author.name}
                </span>
                <PixelBadge role={publication.author.role} />
              </div>
              <span className="text-dark-muted text-xs">@{publication.author.username}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-dark-muted hover:text-white transition-colors"
              title="Opciones de publicación"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 z-30 w-44 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs"
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

        {publication.content && (
          <FormattedText
            text={publication.content}
            className="text-base text-dark-text whitespace-pre-line leading-relaxed mb-3 font-sans block"
          />
        )}

        <MediaGrid images={publication.images || []} />
        <LinkPreviewCard
          embeds={publication.embeds}
          targetPublication={publication.type === 'quote' ? publication.target_publication : undefined}
        />

        <div className="py-2 border-y border-dark-border/60 text-xs text-dark-muted my-3">
          {new Date(publication.created_at).toLocaleString()}
        </div>

        <PublicationActions
          postId={publication.id}
          initialUpvotes={publication.upvotes_count || 0}
          initialIsUpvoted={publication.is_upvoted}
          initialShares={publication.shares_count || 0}
          initialIsShared={publication.is_shared}
          initialIsQuoted={publication.is_quoted}
          quotesCount={publication.quotes_count || 0}
          commentsCount={publication.comments_count || replies.length}
          onQuoteClick={() => isAuthenticated ? openPostModal(publication) : navigate('/signin')}
        />
      </article>

      {isAuthenticated && (
        <ReplyComposer
          targetId={id!}
          onSubmit={(formData) => replyMutation.mutate(formData)}
          isSubmitting={replyMutation.isPending}
        />
      )}

      <div>
        {replies.length > 0 ? (
          replies.map((comment: any) => <PublicationCard key={comment.id} post={comment} />)
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No hay respuestas todavía. ¡Sé el primero en responder!</div>
        )}
      </div>
    </div>
  );
};
