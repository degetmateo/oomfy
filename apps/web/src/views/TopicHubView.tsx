import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { DEFAULT_TOPICS as POPULAR_TOPICS } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';
import { UrlHelper } from '../utils/UrlHelper.js';

export const TopicHubView: React.FC = () => {
  const { tag = 'comunidad' } = useParams<{ tag: string }>();
  const cleanTag = UrlHelper.decodeParamSafe(tag).replace(/^#/, '').toLowerCase();

  const { posts, isLoading, isFetchingNextPage, hasNextPage, refetch, loadMoreRef } = useCursorFeed({
    queryKey: ['topic-hub', cleanTag],
    buildUrl: (olderId) => {
      const p = new URLSearchParams({ query: cleanTag, limit: '20' });
      if (olderId) p.set('older_id', olderId);
      return `/publications?${p.toString()}`;
    },
  });

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <SeoHead
        title={`#${cleanTag} — Publicaciones y Comunidad sobre ${cleanTag} | Oomfy`}
        description={`Explora las últimas publicaciones, debates, imágenes y creadores hablando sobre #${cleanTag} en Oomfy.`}
        canonicalPath={`/t/${encodeURIComponent(cleanTag)}`}
      />
      <Header title={`#${cleanTag}`} subtitle="Comunidad temática" onRefresh={() => refetch()} />

      <section className="p-4 border-b border-dark-border bg-dark-card/30">
        <div className="flex items-center gap-2 text-brand-400 mb-1">
          <Hash className="w-5 h-5" />
          <h1 className="text-base sm:text-lg font-bold text-white">Comunidad de #{cleanTag} en Oomfy</h1>
        </div>
        <h2 className="text-xs text-dark-muted font-sans leading-relaxed">
          Descubre publicaciones, arte, hilos y debates recientes sobre <strong className="text-white">#{cleanTag}</strong>.
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {POPULAR_TOPICS.map((t) => (
            <Link key={t} to={`/t/${t}`} className={`px-2 py-0.5 text-[11px] border transition-colors ${t === cleanTag ? 'border-brand-400 bg-brand-500/20 text-brand-400 font-bold' : 'border-dark-border text-dark-muted hover:text-white'}`}>
              #{t}
            </Link>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones de #{cleanTag}...</div>
      ) : posts.length > 0 ? (
        <div className="divide-y divide-dark-border">
          {posts.map((post) => <PublicationCard key={post.id} post={post} />)}
          <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
            {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
            {hasNextPage && <a href={`/t/${encodeURIComponent(cleanTag)}?page=2`} className="sr-only">Siguiente página</a>}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted">No hay publicaciones recientes con #{cleanTag}. ¡Sé el primero en publicar sobre este tema!</div>
      )}
    </div>
  );
};
