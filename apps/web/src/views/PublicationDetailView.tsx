import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { ApiClient } from '../services/api.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ThreadAncestorsList } from '../components/publication/ThreadAncestorsList.js';
import { PublicationDetailArticle } from '../components/publication/PublicationDetailArticle.js';
import { ReplyComposer } from '../components/publication/ReplyComposer.js';
import { useAuthStore } from '../stores/authStore.js';
import { useUIStore } from '../stores/uiStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';

export const PublicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();
  const targetArticleRef = useRef<HTMLElement>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => (await ApiClient.get<any>(`/publications/${id}`)).data,
    placeholderData: () => PublicationCacheService.getPlaceholderDetailData(queryClient, id),
    staleTime: 30 * 1000,
    enabled: Boolean(id),
  });

  const replyMutation = useMutation({
    mutationFn: (formData: FormData) => ApiClient.post('/publications', formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['publication', id] }); queryClient.invalidateQueries({ queryKey: ['feed'] }); },
  });

  const publication: Publication | undefined = data?.publication;
  const ancestors: Publication[] = data?.ancestors || [];
  const replies: Publication[] = data?.replies || data?.thread || [];

  useEffect(() => {
    if (!publication || !targetArticleRef.current) return;
    if (ancestors.length > 0) {
      const timer = setTimeout(() => targetArticleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id, Boolean(publication), ancestors.length]);

  if (isLoading) return <div className="p-8 text-center text-dark-muted font-mono">Cargando publicación...</div>;
  if (error || !publication) return <div className="p-8 text-center text-red-400 font-mono">Publicación no encontrada.</div>;

  const canDelete = Boolean(user && (user.id === publication.author.id || ['admin', 'mod'].includes(user.role)));
  const snippet = (publication.content || 'Publicación multimedia').replace(/\s+/g, ' ').trim();
  const plain = snippet.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
  const isThin = plain.length < 15 && (!publication.images || publication.images.length === 0);
  const ogImg = publication.images?.[0]?.url || `https://oomfy.online/og/user/${publication.author.username}`;

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({ title: 'Eliminar publicación', message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.', isDanger: true });
    if (!confirmed) return;
    try {
      await ApiClient.delete(`/publications/${publication.id}`);
      queryClient.invalidateQueries({ queryKey: ['feed'] }); queryClient.invalidateQueries({ queryKey: ['user-posts'] }); navigate(-1);
    } catch (err: any) { dialog.alert(err.message, 'Error al eliminar'); }
  };

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'SocialMediaPosting', headline: snippet.slice(0, 110), articleBody: publication.content || '', datePublished: publication.created_at,
    author: { '@type': 'Person', name: publication.author.name, url: `https://oomfy.online/${publication.author.username}` },
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: publication.upvotes_count || 0 },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: publication.comments_count || replies.length },
    ],
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="font-mono">
        <SeoHead title={`${publication.author.name}: "${snippet.slice(0, 60)}" en Oomfy`} description={snippet.slice(0, 155)} canonicalPath={`/publication/${publication.id}`} ogImage={ogImg} ogType="article" noIndex={isThin} jsonLd={jsonLd} />
        <Header title="Publicación" onRefresh={() => refetch()} isRefreshing={isFetching} />
        <ThreadAncestorsList publicationId={publication.id} initialAncestors={ancestors} hasMoreInitial={Boolean(data?.has_more_ancestors)} totalAncestors={data?.total_ancestors || ancestors.length} />
        <PublicationDetailArticle publication={publication} repliesCount={replies.length} canDelete={canDelete} isAuthenticated={isAuthenticated} articleRef={targetArticleRef} onDelete={handleDelete} onQuote={() => (isAuthenticated ? openPostModal(publication) : navigate('/signin'))} />
        {isAuthenticated && <ReplyComposer targetId={id!} onSubmit={(fd) => replyMutation.mutate(fd)} isSubmitting={replyMutation.isPending} />}
        <div>
          {replies.length > 0 ? replies.map((c: any) => <PublicationCard key={c.id} post={c} />) : isFetching ? (
            <div className="p-8 text-center text-xs text-dark-muted flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-brand-400" /><span>Cargando respuestas...</span></div>
          ) : <div className="p-8 text-center text-xs text-dark-muted">No hay respuestas todavía. ¡Sé el primero en responder!</div>}
        </div>
      </div>
    </PullToRefresh>
  );
};
