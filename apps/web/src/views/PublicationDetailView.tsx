import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { ApiClient } from '../services/api.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ThreadAncestorsList } from '../components/publication/ThreadAncestorsList.js';
import { PublicationActions } from '../components/publication/PublicationActions.js';
import { PublicationMenu } from '../components/publication/PublicationMenu.js';
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
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { Publication } from '@oomfy/shared';

export const PublicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();
  const targetArticleRef = useRef<HTMLElement | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const res = await ApiClient.get<any>(`/publications/${id}`);
      return res.data;
    },
    placeholderData: () => PublicationCacheService.getPlaceholderDetailData(queryClient, id),
    staleTime: 30 * 1000,
    enabled: Boolean(id),
  });

  const replyMutation = useMutation({
    mutationFn: (formData: FormData) => ApiClient.post('/publications', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const publication: Publication | undefined = data?.publication;
  const ancestors: Publication[] = data?.ancestors || [];
  const replies: Publication[] = data?.replies || data?.thread || [];

  useEffect(() => {
    if (publication && targetArticleRef.current) {
      if (ancestors.length > 0) {
        const timer = setTimeout(() => {
          targetArticleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return () => clearTimeout(timer);
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [id, Boolean(publication), ancestors.length]);

  if (isLoading) {
    return <div className="p-8 text-center text-dark-muted font-mono">Cargando publicación...</div>;
  }
  if (error || !publication) {
    return <div className="p-8 text-center text-red-400 font-mono">Publicación no encontrada.</div>;
  }

  const canDelete = Boolean(
    user && (user.id === publication.author.id || ['admin', 'mod'].includes(user.role))
  );

  const handleDelete = async () => {
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
    } catch (err: any) {
      dialog.alert(err.message, 'Error al eliminar');
    }
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="font-mono">
        <Header title="Publicación" onRefresh={() => refetch()} isRefreshing={isFetching} />

        <ThreadAncestorsList
          publicationId={publication.id}
          initialAncestors={ancestors}
          hasMoreInitial={Boolean(data?.has_more_ancestors)}
          totalAncestors={data?.total_ancestors || ancestors.length}
        />

        <article
          ref={targetArticleRef}
          className="p-4 border-b border-dark-border bg-dark-card/20 relative"
        >
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
                  <span
                    onClick={() => navigate(`/${publication.author.username}`)}
                    className="font-bold text-white hover:text-brand-400 cursor-pointer"
                  >
                    {publication.author.name}
                  </span>
                  <PixelBadge role={publication.author.role} />
                </div>
                <span
                  onClick={() => navigate(`/${publication.author.username}`)}
                  className="text-dark-muted text-xs cursor-pointer hover:underline"
                >
                  @{publication.author.username}
                </span>
              </div>
            </div>

            <PublicationMenu
              postId={publication.id}
              authorId={publication.author.id}
              authorUsername={publication.author.username}
              content={publication.content}
              canDelete={canDelete}
              onDelete={handleDelete}
            />
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
            targetPublication={
              publication.type === 'quote' ? publication.target_publication : undefined
            }
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
            onQuoteClick={() =>
              isAuthenticated ? openPostModal(publication) : navigate('/signin')
            }
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
          ) : isFetching ? (
            <div className="p-8 text-center text-xs text-dark-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
              <span>Cargando respuestas...</span>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-dark-muted">
              No hay respuestas todavía. ¡Sé el primero en responder!
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
};
