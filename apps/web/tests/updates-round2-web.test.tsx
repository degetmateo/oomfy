import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Notification, Publication, PublicationEmbed, PublicUser } from '@oomfy/shared';
import { PixelAvatar, resolveAvatarPixelSize } from '../src/components/common/PixelAvatar.js';
import { ProfileInfo } from '../src/components/profile/ProfileInfo.js';
import { EditProfileModal } from '../src/components/profile/EditProfileModal.js';
import { ChatMessageItem } from '../src/components/chat/ChatMessageItem.js';
import { ChatMessageMedia } from '../src/components/chat/ChatMessageMedia.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { PublicationDetailArticle } from '../src/components/publication/PublicationDetailArticle.js';
import { LinkPreviewCard } from '../src/components/publication/LinkPreviewCard.js';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';
import { HomeView } from '../src/views/HomeView.js';
import { QueryPersistenceService } from '../src/services/QueryPersistenceService.js';
import { clearLocalCacheDb, getCacheEntry, setCacheEntry } from '../src/services/LocalCacheDb.js';
import { CACHE_SCHEMA_VERSION, PERSIST_MAX_AGE_MS } from '../src/services/localPersistenceHelpers.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { notificationIdentityMap } from '../src/models/NotificationIdentityMap.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { ApiClient } from '../src/services/api.js';

const makeUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: 'u1',
  username: 'alice',
  name: 'Alice',
  role: 'admin',
  bio: 'Bio',
  pronouns: null,
  location: null,
  link: null,
  icon_url: 'https://cdn.example.com/alice.png',
  banner_url: null,
  created_at: new Date().toISOString(),
  follower_count: 10,
  followed_count: 5,
  publication_count: 3,
  ...overrides,
});

const makePost = (overrides: Partial<Publication> = {}): Publication => ({
  id: 'p1',
  author: { id: 'u1', username: 'alice', name: 'Alice', role: 'admin', icon_url: 'https://cdn.example.com/alice.png', banner_url: null },
  type: 'default',
  content: 'Post de prueba',
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images: [],
  embeds: [],
  upvotes_count: 1,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
  ...overrides,
});

describe('Frontend 8 Updates Verification Suite', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    publicationIdentityMap.clear();
    userIdentityMap.clear();
    notificationIdentityMap.clear();
    QueryPersistenceService.resetRuntimeState();
    await clearLocalCacheDb();
    useAuthStore.setState({ isAuthenticated: true, user: makeUser() as any, isLoading: false });
  });

  // 1. Profile avatar rendering quality & chat compositor fix
  it('renders PixelAvatar and ProfileInfo avatars with matching dimensions, aspect-square, and auto imageRendering', () => {
    expect(resolveAvatarPixelSize('w-12 h-12')).toBe(48);
    expect(resolveAvatarPixelSize('w-11 h-11 md:w-12 md:h-12')).toBe(48);
    expect(resolveAvatarPixelSize('w-20 h-20')).toBe(80);

    const { rerender } = render(<PixelAvatar src="https://cdn.example.com/a.jpg" username="alice" sizeClass="w-14 h-14" />);
    const avatarImg = screen.getByRole('img', { name: 'alice' });
    expect(avatarImg).toHaveAttribute('width', '56');
    expect(avatarImg).toHaveAttribute('height', '56');
    expect(avatarImg.style.imageRendering).toBe('auto');
    expect(avatarImg.parentElement?.className).toContain('aspect-square');

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <ProfileInfo user={makeUser({ pronouns: 'elle/le' })} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const profileImg = screen.getByRole('img', { name: 'alice' });
    expect(profileImg).toHaveAttribute('width', '112');
    expect(profileImg).toHaveAttribute('height', '112');
    expect(profileImg).toHaveAttribute('loading', 'eager');
    expect(profileImg).toHaveAttribute('fetchpriority', 'high');
    expect(profileImg.style.imageRendering).toBe('auto');

    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <ChatMessageItem message={{ id: 'm1', chat_id: 'c1', sender_id: 'u1', sender: makeUser(), content: 'Hola', created_at: new Date().toISOString() }} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const row = container.querySelector('#msg-m1') as HTMLElement;
    expect(row.style.transform).toBe('');
  });

  // 2. Single media in chat without zoom/crop
  it('renders single image/GIF in ChatMessageMedia with object-contain and imageRendering auto', () => {
    render(<ChatMessageMedia mediaUrls={['https://cdn.example.com/single.png']} />);
    const img = screen.getByRole('img', { name: 'Adjunto' });
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('max-w-full');
    expect(img.style.imageRendering).toBe('auto');
  });

  // 3. Cache staleness fixes & LRU eviction
  it('discards legacy v1 snapshots, evicts expired queries, keeps feed at Tier 0, and enforces LRU bounds on identity maps', async () => {
    const qc = new QueryClient();
    await setCacheEntry('oomfy_queries_u1', {
      savedAt: Date.now(),
      queries: [{ queryKey: ['feed', 'global'], data: { pages: [{ success: true, data: [makePost()] }], pageParams: [null] } }],
    });
    const hydratedV1 = await QueryPersistenceService.hydrateFromLocalDb(qc, 'u1');
    expect(hydratedV1).toBe(false);
    expect(qc.getQueryData(['feed', 'global'])).toBeUndefined();

    const expiredTs = Date.now() - PERSIST_MAX_AGE_MS - 1000;
    await setCacheEntry('oomfy_queries_u1', {
      version: CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      queries: [
        { queryKey: ['feed', 'global'], data: { pages: [{ success: true, data: [makePost({ id: 'old-post' })] }], pageParams: [null] }, dataUpdatedAt: expiredTs, lastAccessedAt: expiredTs },
      ],
    });
    expect(await QueryPersistenceService.hydrateFromLocalDb(qc, 'u1')).toBe(false);

    // Tier-0 feed survives 50-query eviction cap even when 55 secondary queries exist
    const qc2 = new QueryClient();
    qc2.setQueryData(['feed', 'global'], { pages: [{ success: true, data: [makePost({ id: 'fresh-post' })] }], pageParams: [null] });
    for (let i = 0; i < 55; i++) {
      qc2.setQueryData(['explore-posts', `q-${i}`], { pages: [{ success: true, data: [] }], pageParams: [null] });
    }
    await QueryPersistenceService.persistSnapshot(qc2, 'u1');
    const saved = await getCacheEntry<any>('oomfy_queries_u1');
    expect(saved.queries).toHaveLength(50);
    expect(saved.queries.some((q: any) => q.queryKey[0] === 'feed')).toBe(true);

    // Bounded LRU in PublicationIdentityMap (max 400)
    const manyPosts = Array.from({ length: 420 }, (_, i) => makePost({ id: `p-${i}` }));
    publicationIdentityMap.ingest(manyPosts, Date.now());
    expect(publicationIdentityMap.getAll().length).toBe(400);
    expect(publicationIdentityMap.get('p-0')).toBeUndefined();
    expect(publicationIdentityMap.get('p-419')).toBeDefined();
  });

  // 4. Grouped like & share notifications + thumbs-up icon
  it('renders PixelThumb for upvote notifications, grouped copy, and coalesces realtime pendingCount', () => {
    const alice = makeUser({ id: 'u1', username: 'alice', name: 'Alice' });
    const bob = makeUser({ id: 'u2', username: 'bob', name: 'Bob' });
    const carol = makeUser({ id: 'u3', username: 'carol', name: 'Carol' });

    const groupedUpvote: Notification = {
      id: 'n-up-1',
      recipient_id: 'owner-1',
      sender: carol,
      actors: [carol, bob, alice],
      actor_ids: ['u3', 'u2', 'u1'],
      actors_count: 3,
      type: 'upvote',
      target_publication_id: 'p-target',
      target_publication: makePost({ id: 'p-target', content: 'Mi post favorito' }),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { container, rerender } = render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <NotificationItem notif={groupedUpvote} isUnread />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('y 2 más indicaron que les gusta tu publicación.')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="thumb"]')).toBeInTheDocument();
    expect(container.querySelector('.lucide-heart')).toBeNull();

    const groupedShare: Notification = { ...groupedUpvote, id: 'n-sh-1', type: 'share', actors_count: 4 };
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <NotificationItem notif={groupedShare} isUnread />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('y 3 más compartieron tu publicación.')).toBeInTheDocument();

    notificationIdentityMap.prependRealtime(groupedUpvote);
    expect(notificationIdentityMap.getPendingCount()).toBe(1);
    notificationIdentityMap.prependRealtime({ ...groupedUpvote, id: 'n-up-2', actors_count: 4 });
    expect(notificationIdentityMap.getPendingCount()).toBe(1);
    expect(notificationIdentityMap.getNotifications()).toHaveLength(1);
  });

  // 5. Auto-refresh timeline preserving scroll position + floating pill
  it('prepends new timeline posts on poll, preserves scroll via scrollBy, and scrolls to top when clicking the pill', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const initialPosts = [makePost({ id: 'p-1', content: 'Post inicial 1' })];
      const newPosts = [makePost({ id: 'p-2', content: 'Post nuevo 2' }), ...initialPosts];
      let feedCallCount = 0;
      vi.spyOn(ApiClient, 'get').mockImplementation(async (endpoint: string) => {
        if (endpoint.startsWith('/publications')) {
          feedCallCount += 1;
          return { success: true, data: feedCallCount === 1 ? initialPosts : newPosts } as any;
        }
        return { success: true, data: [] } as any;
      });
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <MemoryRouter>
          <QueryClientProvider client={qc}>
            <HomeView />
          </QueryClientProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Post inicial 1')).toBeInTheDocument();
      });
      expect(screen.queryByText('Post nuevo 2')).toBeNull();

      const anchorEl = document.querySelector('[data-feed-post-id="p-1"]') as HTMLElement | null;
      expect(anchorEl).not.toBeNull();
      vi.spyOn(anchorEl!, 'getBoundingClientRect').mockImplementation(() => {
        const hasPrepended = Boolean(document.querySelector('[data-feed-post-id="p-2"]'));
        return (hasPrepended
          ? { top: 320, bottom: 460, left: 0, right: 500, width: 500, height: 140, x: 0, y: 320, toJSON: () => {} }
          : { top: 120, bottom: 260, left: 0, right: 500, width: 500, height: 140, x: 0, y: 120, toJSON: () => {} }) as DOMRect;
      });

      // Advance 30s auto-refresh interval and flush async fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_500);
      });

      await waitFor(() => {
        expect(screen.getByText('Post nuevo 2')).toBeInTheDocument();
      });
      expect(scrollBySpy).toHaveBeenCalledWith(0, 200);
      const pill = screen.getByRole('button', { name: /1 nueva publicación/i });
      expect(pill).toBeInTheDocument();

      fireEvent.click(pill);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(screen.queryByRole('button', { name: /nueva publicación/i })).toBeNull();
      scrollBySpy.mockRestore();
      scrollToSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  // 6. Wikipedia embed card
  it('renders WikipediaEmbedCard inside LinkPreviewCard and routes to /external warning', () => {
    const wikiEmbed: PublicationEmbed = {
      type: 'wikipedia',
      url: 'https://es.wikipedia.org/wiki/Alan_Turing',
      title: 'Alan Turing',
      article_description: 'Matemático y científico de la computación británico',
      description: 'Alan Mathison Turing fue un matemático, lógico, informático teórico y criptógrafo.',
      thumbnail_url: 'https://upload.wikimedia.org/turing.jpg',
      language: 'es',
    };

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LinkPreviewCard embeds={[wikiEmbed]} />} />
          <Route path="/external" element={<div data-testid="ext-warning">Ext</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Wikipedia • ES')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Matemático y científico de la computación británico')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/external?url=${encodeURIComponent('https://es.wikipedia.org/wiki/Alan_Turing')}`);
    fireEvent.click(link);
    expect(screen.getByTestId('ext-warning')).toBeInTheDocument();
  });

  // 7 & 8. No role badges in publications/details/quotes, kept in ProfileInfo + editable pronouns
  it('hides role badges on publications/details/quotes while keeping them and pronouns on profiles & EditProfileModal', async () => {
    const qc = new QueryClient();
    const adminPost = makePost({
      id: 'p-adm-1',
      content: 'Publicación de admin',
      target_publication: makePost({ id: 'p-q-1', content: 'Cita de admin' }),
      type: 'quote',
    });

    const { rerender } = render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <PublicationCard post={adminPost} />
          <PublicationDetailArticle
            publication={adminPost}
            repliesCount={0}
            canDelete={false}
            isAuthenticated
            articleRef={React.createRef()}
            onDelete={vi.fn()}
            onQuote={vi.fn()}
          />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText('[ADMIN]')).toBeNull();

    const userWithPronouns = makeUser({ pronouns: 'he/him' });
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <ProfileInfo user={userWithPronouns} isOwnProfile />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('[ADMIN]')).toBeInTheDocument();
    expect(screen.getByText('he/him')).toBeInTheDocument();

    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({
      success: true,
      data: { ...userWithPronouns, pronouns: 'they/them' },
    } as any);
    const onUpdated = vi.fn();
    render(
      <EditProfileModal user={userWithPronouns} isOpen onClose={vi.fn()} onUpdated={onUpdated} />
    );

    const pronounsInput = within(screen.getByRole('dialog')).getByLabelText('Pronombres');
    fireEvent.change(pronounsInput, { target: { value: 'they/them' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/members/me', expect.any(FormData)));
    const sent = putSpy.mock.calls[0][1] as FormData;
    expect(sent.get('pronouns')).toBe('they/them');
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ pronouns: 'they/them' }));
  });
});
