import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { UserSearchCard } from '../components/profile/UserSearchCard.js';
import { ExploreFilterPanel } from '../components/explore/ExploreFilterPanel.js';
import { ApiClient } from '../services/api.js';
import { Publication, PublicUser } from '@oomfy/shared';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const ExploreView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ author: '', since: '', until: '', hasMedia: false });

  useEffect(() => {
    if (initialQ !== searchTerm) setSearchTerm(initialQ);
  }, [initialQ]);

  const {
    data: postsData,
    isLoading: loadingPosts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<{ success: boolean; data: Publication[] }>({
    queryKey: ['explore-posts', searchTerm, filters],
    queryFn: ({ pageParam }: { pageParam: any }) => {
      const p = new URLSearchParams();
      if (searchTerm) p.append('query', searchTerm);
      if (filters.author) p.append('author_username', filters.author);
      if (filters.since) p.append('since', filters.since);
      if (filters.until) p.append('until', filters.until);
      if (filters.hasMedia) p.append('has_media', 'true');
      p.append('limit', '20');
      if (pageParam) p.append('older_id', String(pageParam));
      return ApiClient.get(`/publications?${p.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const posts = lastPage?.data || [];
      return posts.length >= 20 ? posts[posts.length - 1]?.id : undefined;
    },
    enabled: activeTab === 'posts',
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, Boolean(hasNextPage));

  const { data: usersData, isLoading: loadingUsers } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['explore-users', searchTerm],
    queryFn: () => ApiClient.get(`/aux/search-users?q=${encodeURIComponent(searchTerm)}`),
    enabled: activeTab === 'users',
  });

  const allPosts = postsData?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Explorar" />

      <div className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchParams(e.target.value ? { q: e.target.value } : {});
              }}
              placeholder="Buscar palabras, temas, frases..."
              className="w-full pl-9 pr-8 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setSearchParams({}); }} className="absolute right-2.5 top-2.5 text-dark-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {activeTab === 'posts' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border transition-colors ${showFilters ? 'bg-brand-500 text-black border-brand-500' : 'border-dark-border bg-dark-card text-dark-muted hover:text-white'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex border-b border-dark-border mt-3 text-xs">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2 font-bold transition-colors border-b-2 ${activeTab === 'posts' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'}`}
          >
            Publicaciones
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 font-bold transition-colors border-b-2 ${activeTab === 'users' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'}`}
          >
            Usuarios
          </button>
        </div>
      </div>

      {showFilters && activeTab === 'posts' && (
        <ExploreFilterPanel
          values={filters}
          onChange={setFilters}
          onReset={() => setFilters({ author: '', since: '', until: '', hasMedia: false })}
        />
      )}

      <div>
        {activeTab === 'posts' ? (
          loadingPosts ? (
            <div className="p-8 text-center text-xs text-dark-muted">Buscando publicaciones...</div>
          ) : allPosts.length > 0 ? (
            <>
              {allPosts.map((post) => (
                <PublicationCard key={post.id} post={post} />
              ))}
              <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
                {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-dark-muted">No se encontraron publicaciones.</div>
          )
        ) : loadingUsers ? (
          <div className="p-8 text-center text-xs text-dark-muted">Buscando usuarios...</div>
        ) : usersData?.data && usersData.data.length > 0 ? (
          usersData.data.map((user) => <UserSearchCard key={user.id} user={user} />)
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>
        )}
      </div>
    </div>
  );
};
