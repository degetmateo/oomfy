import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { CachedTabPanel } from '../components/common/CachedTabPanel.js';
import { PublicationCreator } from '../components/publication/PublicationCreator.js';
import {
  HomeTimelineTab, HOME_TIMELINE_TABS, HOME_TIMELINE_STORAGE_KEY, readSavedTimelineTab,
  HomeTimelineTabs, ForYouDevelopmentPanel, TimelineFeedList,
} from '../components/publication/HomeTimelineTabs.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';
import { useTimelineAutoRefresh } from '../hooks/useTimelineAutoRefresh.js';
import { safeLocalGet, safeLocalSet } from '../utils/safeStorage.js';

export const HomeView: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<HomeTimelineTab>(() => readSavedTimelineTab(safeLocalGet(HOME_TIMELINE_STORAGE_KEY)));

  const buildGlobalUrl = (olderId: string | null) =>
    `/publications${olderId ? `?older_id=${olderId}&limit=20` : '?limit=20'}`;
  const buildFollowingUrl = (olderId: string | null) =>
    `/publications?feed=following&limit=20${olderId ? `&older_id=${olderId}` : ''}`;

  const globalFeed = useCursorFeed({
    queryKey: ['feed', 'global'],
    buildUrl: buildGlobalUrl,
    enabled: activeTab === 'global',
  });
  const followingFeed = useCursorFeed({
    queryKey: ['feed', 'following'],
    buildUrl: buildFollowingUrl,
    enabled: activeTab === 'following' && isAuthenticated,
  });

  const globalAutoRefresh = useTimelineAutoRefresh({
    queryKey: ['feed', 'global'],
    buildUrl: buildGlobalUrl,
    enabled: activeTab === 'global',
    currentPosts: globalFeed.posts,
  });
  const followingAutoRefresh = useTimelineAutoRefresh({
    queryKey: ['feed', 'following'],
    buildUrl: buildFollowingUrl,
    enabled: activeTab === 'following' && isAuthenticated,
    currentPosts: followingFeed.posts,
  });

  const activeAutoRefresh = activeTab === 'following' ? followingAutoRefresh : globalAutoRefresh;

  const handleTabChange = (nextTab: HomeTimelineTab) => {
    globalAutoRefresh.clearUnseen();
    followingAutoRefresh.clearUnseen();
    setActiveTab(nextTab);
    safeLocalSet(HOME_TIMELINE_STORAGE_KEY, nextTab);
  };

  const { touchHandlers } = useTabSwipe({ tabs: HOME_TIMELINE_TABS, activeTab, onTabChange: handleTabChange });

  const handleRefresh = async () => {
    activeAutoRefresh.clearUnseen();
    if (activeTab === 'global') await globalFeed.refetch();
    else if (activeTab === 'following' && isAuthenticated) await followingFeed.refetch();
  };

  const unseenCount = activeTab !== 'foryou' ? activeAutoRefresh.unseenNewCount : 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div {...touchHandlers} className="flex flex-col min-h-screen font-mono relative">
        <SeoHead
          title="oomfy — Para la oomfiada"
          description="Explora publicaciones, debates, arte digital, gaming y comunidades en tiempo real en oomfy."
          canonicalPath="/"
          jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'oomfy', url: SITE_URL }}
        />
        <Header title="Inicio" onRefresh={handleRefresh} />
        <HomeTimelineTabs activeTab={activeTab} onTabChange={handleTabChange} />
        {isAuthenticated ? (
          <div className="hidden md:block"><PublicationCreator /></div>
        ) : (
          <section className="p-4 border-b border-dark-border bg-dark-card/30">
            <h1 className="text-base sm:text-lg font-bold text-white">Oomfy — Para la oomfiada</h1>
            <h2 className="text-xs text-dark-muted mt-1 font-sans leading-relaxed">Explora con los oomfies</h2>
          </section>
        )}

        {unseenCount > 0 && (
          <div className="sticky top-[4.25rem] z-30 flex justify-center pointer-events-none py-2 -mb-10">
            <button
              ref={activeAutoRefresh.pillButtonRef}
              type="button"
              onClick={activeAutoRefresh.scrollToTopAndClear}
              className="pointer-events-auto bg-dark-card/95 border-2 border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black shadow-pixel font-mono text-xs font-bold px-3.5 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {unseenCount === 1 ? '1 nueva publicación' : `${unseenCount} nuevas publicaciones`}
              </span>
            </button>
          </div>
        )}

        <CachedTabPanel active={activeTab === 'global'}>
          <TimelineFeedList
            posts={globalFeed.posts} isLoading={globalFeed.isLoading} isFetchingNextPage={globalFeed.isFetchingNextPage}
            hasNextPage={globalFeed.hasNextPage} loadMoreRef={globalFeed.loadMoreRef}
            listContainerRef={globalAutoRefresh.listContainerRef}
            emptyTitle="No hay publicaciones aún." emptySubtitle="¡Sé el primero en compartir algo en oomfy!"
          />
        </CachedTabPanel>
        <CachedTabPanel active={activeTab === 'following'}>
          {!isAuthenticated ? (
            <div className="p-8 text-center text-xs text-dark-muted">
              <p className="font-bold text-white">Inicia sesión para ver las publicaciones de quienes sigues.</p>
              <Link to="/signin" className="inline-block mt-3 px-4 py-2 bg-brand-500 text-black font-bold uppercase pixel-button">Entrar</Link>
            </div>
          ) : (
            <TimelineFeedList
              posts={followingFeed.posts} isLoading={followingFeed.isLoading} isFetchingNextPage={followingFeed.isFetchingNextPage}
              hasNextPage={followingFeed.hasNextPage} loadMoreRef={followingFeed.loadMoreRef}
              listContainerRef={followingAutoRefresh.listContainerRef}
              emptyTitle="Aún no hay publicaciones aquí." emptySubtitle="Sigue a otros miembros de oomfy para ver sus publicaciones en esta timeline."
            />
          )}
        </CachedTabPanel>
        <CachedTabPanel active={activeTab === 'foryou'}>
          <ForYouDevelopmentPanel onGoGlobal={() => handleTabChange('global')} />
        </CachedTabPanel>
      </div>
    </PullToRefresh>
  );
};
