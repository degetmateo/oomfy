import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ExploreFilterPanel } from '../components/explore/ExploreFilterPanel.js';
import { ExploreUsersTab } from '../components/explore/ExploreUsersTab.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';

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

  const { posts: allPosts, isLoading: loadingPosts, isFetchingNextPage, loadMoreRef } = useCursorFeed({
    queryKey: ['explore-posts', searchTerm, filters],
    buildUrl: (olderId) => {
      const p = new URLSearchParams({ limit: '20' });
      if (searchTerm) p.append('query', searchTerm);
      if (filters.author) p.append('author_username', filters.author);
      if (filters.since) p.append('since', filters.since);
      if (filters.until) p.append('until', filters.until);
      if (filters.hasMedia) p.append('has_media', 'true');
      if (olderId) p.append('older_id', olderId);
      return `/publications?${p.toString()}`;
    },
    enabled: activeTab === 'posts',
  });

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
              onChange={(e) => { setSearchTerm(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
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
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 border transition-colors ${showFilters ? 'bg-brand-500 text-black border-brand-500' : 'border-dark-border bg-dark-card text-dark-muted hover:text-white'}`}>
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex border-b border-dark-border mt-3 text-xs">
          {(['posts', 'users'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 font-bold transition-colors border-b-2 ${activeTab === tab ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'}`}>
              {tab === 'posts' ? 'Publicaciones' : 'Usuarios'}
            </button>
          ))}
        </div>
      </div>

      {showFilters && activeTab === 'posts' && (
        <ExploreFilterPanel values={filters} onChange={setFilters} onReset={() => setFilters({ author: '', since: '', until: '', hasMedia: false })} />
      )}

      <div>
        {activeTab === 'posts' ? (
          loadingPosts ? <div className="p-8 text-center text-xs text-dark-muted">Buscando publicaciones...</div> : allPosts.length > 0 ? (
            <>
              {allPosts.map((post) => <PublicationCard key={post.id} post={post} />)}
              <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">{isFetchingNextPage && <span>Cargando más publicaciones...</span>}</div>
            </>
          ) : <div className="p-8 text-center text-xs text-dark-muted">No se encontraron publicaciones.</div>
        ) : <ExploreUsersTab searchTerm={searchTerm} />}
      </div>
    </div>
  );
};
