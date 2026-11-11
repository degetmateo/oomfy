import React from 'react';
import { SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { PublicationCreator } from '../components/publication/PublicationCreator.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';

export const HomeView: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { posts: allPosts, isLoading, isFetchingNextPage, hasNextPage, refetch, loadMoreRef } = useCursorFeed({
    queryKey: ['feed'],
    buildUrl: (olderId) => `/publications${olderId ? `?older_id=${olderId}&limit=20` : '?limit=20'}`,
  });

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
            <h1 className="text-base sm:text-lg font-bold text-white">Oomfy — Para la oomfiada</h1>
            <h2 className="text-xs text-dark-muted mt-1 font-sans leading-relaxed">Explora con los oomfies</h2>
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
