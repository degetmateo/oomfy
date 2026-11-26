import React from 'react';
import { Wrench } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from './PublicationCard.js';

export type HomeTimelineTab = 'global' | 'following' | 'foryou';
export const HOME_TIMELINE_TABS: readonly HomeTimelineTab[] = ['global', 'following', 'foryou'];
export const HOME_TIMELINE_STORAGE_KEY = 'oomfy_home_timeline_tab';

const LABELS: Record<HomeTimelineTab, string> = {
  global: 'Global',
  following: 'Siguiendo',
  foryou: 'Para ti',
};

export function readSavedTimelineTab(raw: string | null): HomeTimelineTab {
  return raw === 'following' || raw === 'foryou' || raw === 'global' ? raw : 'global';
}

export const HomeTimelineTabs: React.FC<{ activeTab: HomeTimelineTab; onTabChange: (t: HomeTimelineTab) => void }> = ({
  activeTab,
  onTabChange,
}) => (
  <div role="tablist" aria-label="Timelines de inicio" className="flex border-b border-dark-border bg-dark-bg/80 select-none">
    {HOME_TIMELINE_TABS.map((tab) => {
      const selected = activeTab === tab;
      return (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors border-b-2 ${selected ? 'text-brand-400 border-brand-400' : 'text-dark-muted hover:text-white border-transparent'
            }`}
        >
          <span>{LABELS[tab]}</span>
          {tab === 'foryou' && (
            <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-dark-card border border-dark-border text-dark-muted uppercase">
              Dev
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const ForYouDevelopmentPanel: React.FC<{ onGoGlobal: () => void }> = ({ onGoGlobal }) => (
  <section aria-label="Feed Para ti en desarrollo" className="p-8 sm:p-12 text-center font-mono">
    <div className="max-w-sm mx-auto p-6 border-2 border-dark-border bg-dark-card/40 shadow-pixel">
      <Wrench className="w-8 h-8 text-brand-400 mx-auto mb-3" aria-hidden="true" />
      <h2 className="text-sm font-bold text-white uppercase tracking-wider">Para ti — En desarrollo</h2>
      <p className="text-xs text-dark-muted font-sans leading-relaxed mt-2">
        Se viene el algoritmo chavales
      </p>
      <button
        type="button"
        onClick={onGoGlobal}
        className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase pixel-button transition-colors"
      >
        Ir a Global
      </button>
    </div>
  </section>
);

export const TimelineFeedList: React.FC<{
  posts: Publication[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  listContainerRef?: React.RefObject<HTMLDivElement>;
  emptyTitle: string;
  emptySubtitle: string;
}> = ({ posts, isLoading, isFetchingNextPage, hasNextPage, loadMoreRef, listContainerRef, emptyTitle, emptySubtitle }) => {
  if (isLoading) return <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones...</div>;
  if (posts.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-dark-muted">
        <p className="font-bold text-white">{emptyTitle}</p>
        <p className="mt-1">{emptySubtitle}</p>
      </div>
    );
  }
  return (
    <>
      <div ref={listContainerRef} tabIndex={-1} className="divide-y divide-dark-border outline-none">
        {posts.map((post, idx) => (
          <div key={post.id} data-feed-post-id={post.id}>
            <PublicationCard post={post} index={idx} />
          </div>
        ))}
      </div>
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
        {hasNextPage && <a href="/?page=2" className="sr-only">Siguiente página</a>}
      </div>
    </>
  );
};
