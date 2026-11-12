import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate, useNavigationType, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { ApiClient } from '../services/api.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { PublicationDetailSeo } from '../components/publication/PublicationDetailSeo.js';
import { ThreadAncestorsList } from '../components/publication/ThreadAncestorsList.js';
import { PublicationDetailArticle } from '../components/publication/PublicationDetailArticle.js';
import { ReplyComposer } from '../components/publication/ReplyComposer.js';
import { useAuthStore } from '../stores/authStore.js';
import { useUIStore } from '../stores/uiStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { RouteScrollStore } from '../stores/routeScrollStore.js';
import { usePublicationModel } from '../hooks/usePublicationModel.js';

export const PublicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const dialog = useDialogStore();
  const targetArticleRef = useRef<HTMLElement>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const fetchedAt = Date.now();
      const d = (await ApiClient.get<any>(`/publications/${id}`)).data;
      if (d) useEntityRegistryStore.getState().ingestPublications([d.publication, ...(d.ancestors || []), ...(d.replies || d.thread || [])], fetchedAt);
      return d;
    },
    placeholderData: () => PublicationCacheService.getPlaceholderDetailData(queryClient, id),
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(id),
  });

  const replyMutation = useMutation({
    mutationFn: (formData: FormData) => ApiClient.post('/publications', formData),
    onSuccess: () => {
      if (id) PublicationCacheService.applyPatch(queryClient, id, (p) => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
      queryClient.invalidateQueries({ queryKey: ['publication', id] });
    },
  });

  const rawPub: Publication | undefined = data?.publication;
  const livePub = usePublicationModel(rawPub || id);
  const publication = livePub || rawPub;
  const ancestors: Publication[] = data?.ancestors || [];
  const replies: Publication[] = data?.replies || data?.thread || [];

  useEffect(() => {
    if (!publication || !targetArticleRef.current || ancestors.length === 0) return;
    if (navigationType === 'POP' && RouteScrollStore.get(`${location.pathname}${location.search}`) > 0) return;
    const timer = setTimeout(() => targetArticleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => clearTimeout(timer);
  }, [id, Boolean(publication), ancestors.length]);

  if (isLoading) return <div className="p-8 text-center text-dark-muted font-mono">Cargando publicación...</div>;
  if (error || !publication) return <div className="p-8 text-center text-red-400 font-mono">Publicación no encontrada.</div>;

  const canDelete = Boolean(user && (user.id === publication.author.id || ['admin', 'mod'].includes(user.role)));
  const handleDelete = async () => {
    if (!(await dialog.confirm({ title: 'Eliminar publicación', message: '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.', isDanger: true }))) return;
    try {
      await ApiClient.delete(`/publications/${publication.id}`);
      PublicationCacheService.invalidatePublicationLists(queryClient);
      navigate(-1);
    } catch (err: any) { dialog.alert(err.message, 'Error al eliminar'); }
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="font-mono">
        <PublicationDetailSeo publication={publication} repliesCount={replies.length} />
        <Header title="Publicación" onRefresh={() => refetch()} isRefreshing={isFetching} />
        <ThreadAncestorsList publicationId={publication.id} initialAncestors={ancestors} hasMoreInitial={Boolean(data?.has_more_ancestors)} totalAncestors={data?.total_ancestors || ancestors.length} />
        <PublicationDetailArticle publication={publication} repliesCount={replies.length} canDelete={canDelete} isAuthenticated={isAuthenticated} articleRef={targetArticleRef} onDelete={handleDelete} onQuote={() => (isAuthenticated ? openPostModal(publication) : navigate('/signin'))} />
        {isAuthenticated && <ReplyComposer targetId={id!} onSubmit={(fd) => replyMutation.mutate(fd)} isSubmitting={replyMutation.isPending} />}
        <div>
          {replies.length > 0 ? replies.map((c) => <PublicationCard key={c.id} post={c} />) : isFetching ? (
            <div className="p-8 text-center text-xs text-dark-muted flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-brand-400" /><span>Cargando respuestas...</span></div>
          ) : <div className="p-8 text-center text-xs text-dark-muted">No hay respuestas todavía. ¡Sé el primero en responder!</div>}
          <div className="pb-12" />
        </div>
      </div>
    </PullToRefresh>
  );
};
