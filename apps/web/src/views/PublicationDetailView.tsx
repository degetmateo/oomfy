import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ThreadAncestorCard } from '../components/publication/ThreadAncestorCard.js';
import { PublicationActions } from '../components/publication/PublicationActions.js';
import { MediaGrid } from '../components/publication/MediaGrid.js';
import { LinkPreviewCard } from '../components/publication/LinkPreviewCard.js';
import { PixelBadge } from '../components/icons/PixelBadge.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';
import { FormattedText } from '../components/common/FormattedText.js';
import { ReplyComposer } from '../components/publication/ReplyComposer.js';
import { useAuthStore } from '../stores/authStore.js';
import { Publication } from '@oomfy/shared';

export const PublicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

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

  return (
    <div className="font-mono">
      <div className="sticky top-0 z-10 bg-dark-bg/90 backdrop-blur border-b border-dark-border p-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-dark-border text-dark-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-white tracking-wide">Publicación</h2>
      </div>

      {ancestors.length > 0 && (
        <div className="border-b border-dark-border/60 bg-dark-card/10">
          {ancestors.map((anc) => (
            <ThreadAncestorCard key={anc.id} post={anc} />
          ))}
        </div>
      )}

      <article className="p-4 border-b border-dark-border bg-dark-card/20">
        {publication.type === 'shared' && (
          <div className="flex items-center gap-1.5 text-xs text-dark-muted mb-2 font-mono">
            <span>🔁</span>
            <span>Reposteado</span>
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

        <div className="flex items-center gap-3 mb-3">
          <div
            onClick={() => navigate(`/${publication.author.username}`)}
            className="cursor-pointer"
          >
            <PixelAvatar
              src={publication.author.icon_url}
              username={publication.author.username}
              sizeClass="w-12 h-12"
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

        {publication.content && (
          <FormattedText
            text={publication.content}
            className="text-base text-dark-text whitespace-pre-line leading-relaxed mb-3 font-sans block"
          />
        )}

        <MediaGrid images={publication.images || []} />
        <LinkPreviewCard
          embeds={publication.embeds}
          targetPublication={(publication.type === 'quote' || publication.type === 'shared') ? publication.target_publication : undefined}
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
          quotesCount={publication.quotes_count || 0}
          commentsCount={publication.comments_count || replies.length}
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
