import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationMenu } from '../src/components/publication/PublicationMenu.js';
import { PublicationActions } from '../src/components/publication/PublicationActions.js';
import { PublicationDetailView } from '../src/views/PublicationDetailView.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { publicationInteractionCache } from '../src/models/PublicationInteractionCache.js';
import { notificationIdentityMap } from '../src/models/NotificationIdentityMap.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { ApiClient } from '../src/services/api.js';

function deferred<T>() {
  let resolve!: (val: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe('PublicationMenu Layering & Publication Interaction Caching', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    publicationInteractionCache.clear();
    notificationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'viewer-1', username: 'viewer', name: 'Viewer', role: 'member' } as any,
    });
  });

  it('portals PublicationMenu to document.body outside deferred card and follows disclosure a11y rules', () => {
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <article className="feed-card-deferred" data-testid="deferred-card">
            <PublicationMenu postId="p-menu-1" authorId="other-1" authorUsername="other" canDelete={false} />
          </article>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const trigger = screen.getByTitle('Opciones de publicación');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-haspopup');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const card = screen.getByTestId('deferred-card');
    expect(card.contains(screen.getByText('Interacciones'))).toBe(false);
    expect(document.body.contains(screen.getByText('Interacciones'))).toBe(true);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.body.querySelector('[role="menu"]')).toBeNull();
    expect(document.body.querySelector('[role="menuitem"]')).toBeNull();
  });

  it('renders cached is_upvoted/is_shared/is_quoted immediately in detail view and allows clean decrements', async () => {
    const cachedPost: Publication = {
      id: 'pub-int-1',
      author: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'default', content: 'Post cacheado', created_at: '2026-11-01T00:00:00.000Z',
      parent_publication_id: null, root_publication_id: null,
      upvotes_count: 5, shares_count: 3, quotes_count: 2, comments_count: 1,
      is_upvoted: true, is_shared: true, is_quoted: true,
    };
    publicationIdentityMap.ingest([cachedPost], Date.now() - 5000);

    // Undecorated notification ingest must NOT wipe cached flags
    notificationIdentityMap.prependRealtime({
      id: 'n-undec', recipient_id: 'viewer-1', type: 'upvote', status: 'pending',
      target_publication_id: 'pub-int-1', created_at: new Date().toISOString(),
      sender: { id: 'u3', username: 'ana', name: 'Ana', role: 'member', icon_url: null, banner_url: null },
      target_publication: { ...cachedPost, is_upvoted: undefined, is_shared: undefined, is_quoted: undefined },
    });
    expect(publicationIdentityMap.get('pub-int-1')?.is_shared).toBe(true);
    expect(publicationIdentityMap.get('pub-int-1')?.is_quoted).toBe(true);

    const req = deferred<any>();
    vi.spyOn(ApiClient, 'get').mockReturnValue(req.promise);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/publication/pub-int-1']}>
          <Routes><Route path="/publication/:id" element={<PublicationDetailView />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Frame 1 (while fetch still pending): active flags appear immediately!
    expect(screen.getByTitle('Me gusta')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Compartir')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Citar')).toHaveAttribute('aria-pressed', 'true');

    // Fresh server refetch clears share & upvote; counts decrement properly
    req.resolve({
      success: true,
      data: {
        publication: { ...cachedPost, upvotes_count: 4, shares_count: 2, is_upvoted: false, is_shared: false, is_quoted: true },
        ancestors: [],
        replies: [],
      },
    });

    await waitFor(() => {
      expect(screen.getByTitle('Me gusta')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTitle('Me gusta')).toHaveTextContent('4');
      expect(screen.getByTitle('Compartir')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTitle('Compartir')).toHaveTextContent('2');
    });

    // Clearing entity identity map also clears interaction cache (logout isolation)
    publicationIdentityMap.clear();
    expect(publicationInteractionCache.get('pub-int-1')).toBeUndefined();
  });

  it('decrements live counts cleanly even when fallback props carry older higher values', () => {
    const qc = new QueryClient();
    publicationIdentityMap.ingest([{
      id: 'pub-dec-1',
      author: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'default', content: 'Decrement test', created_at: new Date().toISOString(),
      parent_publication_id: null, root_publication_id: null,
      upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
      is_upvoted: false, is_shared: false, is_quoted: false,
    }], Date.now());

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PublicationActions postId="pub-dec-1" initialUpvotes={5} initialIsUpvoted={true} initialShares={3} initialIsShared={true} commentsCount={0} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTitle('Me gusta')).toHaveTextContent('0');
    expect(screen.getByTitle('Me gusta')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTitle('Compartir')).toHaveTextContent('0');
  });
});
