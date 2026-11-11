import React from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DEFAULT_TOPICS as HOME_TOPICS, Publication, SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { PublicationCreator } from '../components/publication/PublicationCreator.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';


export const HomeView: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery<{ success: boolean; data: Publication[] }>({
      queryKey: ['feed'],
      queryFn: ({ pageParam }) => {
        const p = pageParam ? `?older_id=${String(pageParam)}&limit=20` : '?limit=20';
        return ApiClient.get(`/publications${p}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        const posts = lastPage?.data || [];
        return posts.length >= 20 ? posts[posts.length - 1]?.id : undefined;
      },
    });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  const allPosts = data?.pages.flatMap((page) => page.data || []) || [];

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="flex flex-col min-h-screen font-mono">
        <SeoHead
          title="oomfy — Para la oomfiada"
          description="Explora publicaciones, debates, arte digital, gaming y comunidades en tiempo real en oomfy."
          canonicalPath="/"
          jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'oomfy', url: SITE_URL }}
        />
        <Header title="Inicio" onRefresh={() => refetch()} />

        {isAuthenticated ? (
          <div className="hidden md:block">
            <PublicationCreator onCreated={() => refetch()} />
          </div>
        ) : (
          <section className="p-4 border-b border-dark-border bg-dark-card/30">
            <h1 className="text-base sm:text-lg font-bold text-white">
              Oomfy — Para la oomfiada
            </h1>
            <h2 className="text-xs text-dark-muted mt-1 font-sans leading-relaxed">
              Explora con los oomfies
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {HOME_TOPICS.map((t) => (
                <Link key={t} to={`/t/${t}`} className="px-2 py-0.5 text-[11px] border border-dark-border text-brand-400 hover:bg-dark-card">
                  #{t}
                </Link>
              ))}
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones...</div>
        ) : allPosts.length > 0 ? (
          <>
            <div className="divide-y divide-dark-border">
              {allPosts.map((post) => (
                <PublicationCard key={post.id} post={post} />
              ))}
            </div>
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
              {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
              {hasNextPage && <a href="/?page=2" className="sr-only">Siguiente página</a>}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">
            <p className="font-bold text-white">No hay publicaciones aún.</p>
            <p className="mt-1">¡Sé el primero en compartir algo en oomfy!</p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};
