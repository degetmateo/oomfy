import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { QueryPersistenceService } from '../src/services/QueryPersistenceService.js';
import { clearLocalCacheDb } from '../src/services/LocalCacheDb.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { ObservableSubject } from '../src/models/ObservableSubject.js';
import { CachedTabPanel } from '../src/components/common/CachedTabPanel.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';

const samplePost: Publication = {
  id: 'post-cache-1',
  author: { id: 'u1', username: 'ada_dev', name: 'Ada', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content: 'Offline cached publication',
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images: [{ url: 'https://cdn.example.com/photo.webp', source: 'imgbb', index: 0 }],
  embeds: [],
  upvotes_count: 3, shares_count: 1, quotes_count: 0, comments_count: 0,
  is_upvoted: false, is_shared: false,
};

describe('Local Cache Persistence (IndexedDB + SWR), CachedTabPanel & Feed Optimizations', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    userIdentityMap.clear();
    await clearLocalCacheDb();
  });

  it('persists and hydrates feed queries & entities as stale for immediate UI + background revalidation', async () => {
    const qc1 = new QueryClient();
    publicationIdentityMap.seed([samplePost]);
    userIdentityMap.ingest([{ id: 'u1', username: 'ada_dev', name: 'Ada', role: 'member', icon_url: null, banner_url: null, created_at: samplePost.created_at, follower_count: 7, followed_count: 2, publication_count: 4, terms_accepted: true }]);
    qc1.setQueryData(['feed'], { pages: [{ success: true, data: [samplePost] }], pageParams: [null] });
    await QueryPersistenceService.persistSnapshot(qc1, 'u1');

    publicationIdentityMap.clear();
    userIdentityMap.clear();
    const qc2 = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } } });
    const hydrated = await QueryPersistenceService.hydrateFromLocalDb(qc2, 'u1');
    expect(hydrated).toBe(true);
    expect(publicationIdentityMap.get('post-cache-1')?.content).toBe('Offline cached publication');
    expect(userIdentityMap.get('ada_dev')?.follower_count).toBe(7);
    const qState = qc2.getQueryState(['feed']);
    expect((qState?.data as any)?.pages?.[0]?.data?.[0]?.id).toBe('post-cache-1');
    expect(qc2.getQueryCache().find({ queryKey: ['feed'] })?.isStaleByTime(10 * 60 * 1000)).toBe(true);
  });

  it('lazily mounts CachedTabPanel and preserves DOM state with content-visibility: hidden when inactive', () => {
    const { rerender, container } = render(
      <div><CachedTabPanel active={true}><span>Panel A</span></CachedTabPanel><CachedTabPanel active={false}><span>Panel B</span></CachedTabPanel></div>
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).toBeNull();
    rerender(
      <div><CachedTabPanel active={false}><span>Panel A</span></CachedTabPanel><CachedTabPanel active={true}><span>Panel B</span></CachedTabPanel></div>
    );
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    const hiddenPanel = container.querySelector('.spa-tab-panel-inactive');
    expect(hiddenPanel).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenPanel?.textContent).toContain('Panel A');
  });

  it('batches global notifications via ObservableSubject.notifyMany and applies content-visibility/fetchpriority by feed index', () => {
    const subject = new ObservableSubject();
    const globalSpy = vi.fn();
    subject.subscribeGlobal(globalSpy);
    subject.notifyMany(['id-1', 'id-2', 'id-1']);
    expect(globalSpy).toHaveBeenCalledTimes(1);

    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PublicationCard post={samplePost} index={0} />
          <PublicationCard post={{ ...samplePost, id: 'post-cache-2' }} index={5} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const articles = container.querySelectorAll('article');
    expect(articles[0]).not.toHaveClass('feed-card-deferred');
    expect(articles[0].querySelector('img[alt="Adjunto de publicación"]')).toHaveAttribute('fetchpriority', 'high');
    expect(articles[1]).toHaveClass('feed-card-deferred');
    expect(articles[1].querySelector('img[alt="Adjunto de publicación"]')).not.toHaveAttribute('fetchpriority');
  });
});
