import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Header } from '../components/layout/Header.js';
import { PublicationCreator } from '../components/publication/PublicationCreator.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ApiClient } from '../services/api.js';
import { Publication } from '@oomfy/shared';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const HomeView: React.FC = () => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<{ success: boolean; data: Publication[] }>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }: { pageParam: any }) => {
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
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, Boolean(hasNextPage));

  const allPosts = data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Inicio" />
      <div className="hidden md:block">
        <PublicationCreator onCreated={() => refetch()} />
      </div>

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
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted">
          <p className="font-bold text-white">No hay publicaciones aún.</p>
          <p className="mt-1">¡Sé el primero en compartir algo en oomfy!</p>
        </div>
      )}
    </div>
  );
};
