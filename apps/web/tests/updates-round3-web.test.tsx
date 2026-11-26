import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookmarkEntry, BookmarkFolder, Notification, Publication, PublicUser } from '@oomfy/shared';
import { NotificationsView } from '../src/views/NotificationsView.js';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';
import { Navbar } from '../src/components/layout/Navbar.js';
import { MobileBottomNav } from '../src/components/layout/MobileBottomNav.js';
import { PixelThumb } from '../src/components/icons/PixelThumb.js';
import { PixelShare } from '../src/components/icons/PixelShare.js';
import { PixelQuote } from '../src/components/icons/PixelQuote.js';
import { PixelComment } from '../src/components/icons/PixelComment.js';
import { ProfileInfo } from '../src/components/profile/ProfileInfo.js';
import { PublicationActions } from '../src/components/publication/PublicationActions.js';
import { BookmarksView } from '../src/views/BookmarksView.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';
import { useToastStore } from '../src/stores/toastStore.js';
import { ApiClient } from '../src/services/api.js';
import { notificationIdentityMap } from '../src/models/NotificationIdentityMap.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';

const makeUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: 'u-me',
  username: 'alice',
  name: 'Alice',
  role: 'member',
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
  id: 'pub-1',
  author: { id: 'u-other', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content: 'Post guardado de prueba',
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images: [],
  embeds: [],
  upvotes_count: 2,
  shares_count: 1,
  quotes_count: 0,
  comments_count: 0,
  ...overrides,
});

describe('Round 3 Frontend Updates Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    notificationIdentityMap.clear();
    publicationIdentityMap.clear();
    userIdentityMap.clear();
    useToastStore.setState({ toast: null });
    useAuthStore.setState({ isAuthenticated: true, user: makeUser() as any, isLoading: false });
  });

  // 1. Notifications infinite scroll loads older notifications using hasMore & nextCursor
  it('loads older notifications on next page fetch even when page 1 has fewer than 20 collapsed items', async () => {
    const page1: Notification[] = [
      {
        id: 'n-1',
        recipient_id: 'u-me',
        sender: { id: 'u-2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
        type: 'upvote',
        target_publication_id: 'pub-1',
        actors_count: 3,
        status: 'seen',
        created_at: new Date().toISOString(),
      },
    ];
    const page2: Notification[] = [
      {
        id: 'n-older-99',
        recipient_id: 'u-me',
        sender: { id: 'u-3', username: 'carol', name: 'Carol', role: 'member', icon_url: null, banner_url: null },
        type: 'follow',
        target_publication_id: null,
        status: 'seen',
        created_at: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ];

    const getSpy = vi.spyOn(ApiClient, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('older_id=n-raw-20')) {
        return {
          success: true,
          data: { notifications: page2, pendingCount: 0, hasMore: false, nextCursor: null },
        } as any;
      }
      return {
        success: true,
        data: { notifications: page1, pendingCount: 0, hasMore: true, nextCursor: 'n-raw-20' },
      } as any;
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <NotificationsView />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const loadMoreBtn = await screen.findByRole('button', { name: /Cargar más notificaciones/i });
    fireEvent.click(loadMoreBtn);

    expect(await screen.findByText('Carol')).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith('/notifications?older_id=n-raw-20&limit=20');
  });

  // 2. Replaces custom /assets/nav/ images & custom SVGs with Lucide icons
  it('renders Lucide icons across Navbar, MobileBottomNav, and publication icon components without /assets/nav/ images', () => {
    const qc = new QueryClient();
    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <Navbar />
          <MobileBottomNav />
          <PixelThumb active />
          <PixelShare active />
          <PixelQuote active />
          <PixelComment />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(container.querySelector('img[src*="/assets/nav/"]')).toBeNull();
    expect(container.querySelector('[data-nav-icon="home"]')).not.toBeNull();
    expect(container.querySelector('[data-nav-icon="bookmarks"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="thumb"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="share"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="quote"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="comment"]')).not.toBeNull();
  });

  // 3. Grouped notification avatars appear on their own top line with up to 8 + overflow badge
  it('renders grouped avatars in a dedicated top row with up to 8 avatars and overflow badge', () => {
    const actors = Array.from({ length: 10 }, (_, idx) => ({
      id: `actor-${idx}`,
      username: `user${idx}`,
      name: `User ${idx}`,
      role: 'member' as const,
      icon_url: null,
      banner_url: null,
    }));
    const notif: Notification = {
      id: 'n-grp',
      recipient_id: 'u-me',
      sender: actors[0],
      actors,
      actors_count: 10,
      type: 'upvote',
      target_publication_id: 'pub-1',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <NotificationItem notif={notif} isUnread />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const avatarRow = screen.getByTestId('grouped-notif-avatars');
    expect(avatarRow.className).toContain('flex-wrap');
    expect(avatarRow.querySelectorAll('a').length).toBe(8);
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(container.textContent).toContain('y 9 más indicaron que les gusta tu publicación.');
  });

  // 6. Profile submenu right of Follow/Unfollow centralizing Block, Report, and Remove Follower
  it('centralizes Block, Report, and Remove Follower in a submenu to the right of Follow/Unfollow', async () => {
    const otherUser = makeUser({ id: 'u-bob', username: 'bob', name: 'Bob', is_following: false, follows_you: true });
    vi.spyOn(useDialogStore.getState(), 'confirm').mockResolvedValue(true);
    const deleteSpy = vi.spyOn(ApiClient, 'delete').mockResolvedValue({ success: true, removed: true } as any);

    const qc = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <ProfileInfo user={otherUser} isOwnProfile={false} />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Reportar' })).toBeNull();
    const followBtn = screen.getByRole('button', { name: 'Seguir' });
    const moreBtn = screen.getByRole('button', { name: /Más opciones del perfil/i });
    expect(followBtn.compareDocumentPosition(moreBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(moreBtn);
    const removeFollowerItem = await screen.findByRole('menuitem', { name: /Eliminar seguidor/i });
    expect(screen.getByRole('menuitem', { name: /Bloquear usuario/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Reportar usuario/i })).toBeInTheDocument();

    fireEvent.click(removeFollowerItem);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/follows/followers/bob');
    });
  });

  // 4 & 5. PublicationActions Bookmark toggle + Send submenu ("Compartir externamente" + multi-recipient DM modal)
  it('toggles bookmark state and opens Send menu -> multi-recipient DM dialog to share publication', async () => {
    const post = makePost({ id: 'pub-send-1', is_bookmarked: false });
    publicationIdentityMap.ingest([post], Date.now());
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true, data: {} } as any);
    vi.spyOn(ApiClient, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/chats') {
        return {
          success: true,
          data: [
            {
              id: 'chat-1',
              participants: [
                { user: { id: 'u-2', username: 'bob', name: 'Bob', icon_url: null } },
                { user: { id: 'u-3', username: 'carol', name: 'Carol', icon_url: null } },
              ],
            },
          ],
        } as any;
      }
      return { success: true, data: [] } as any;
    });

    const qc = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <PublicationActions
            postId={post.id}
            initialUpvotes={2}
            initialShares={1}
            initialIsBookmarked={false}
            commentsCount={0}
            authorUsername="bob"
            contentPreview={post.content}
          />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const bookmarkBtn = screen.getByRole('button', { name: /Guardar publicación/i });
    fireEvent.click(bookmarkBtn);
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/bookmarks', { publication_id: post.id });
    });

    const sendTrigger = screen.getByRole('button', { name: /Enviar publicación/i });
    fireEvent.click(sendTrigger);

    expect(await screen.findByRole('menuitem', { name: /Compartir externamente/i })).toBeInTheDocument();
    const sendDmItem = screen.getByRole('menuitem', { name: /Enviar por mensaje/i });
    fireEvent.click(sendDmItem);

    expect(await screen.findByRole('heading', { name: /Enviar publicación por mensaje/i })).toBeInTheDocument();
    const bobLabel = await screen.findByText('Bob');
    fireEvent.click(bobLabel);
    const carolLabel = screen.getByText('Carol');
    fireEvent.click(carolLabel);

    fireEvent.change(screen.getByLabelText(/Mensaje opcional/i), { target: { value: 'Échale un ojo' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar \(2\)/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/chats/share-publication', {
        publication_id: post.id,
        recipient_usernames: ['bob', 'carol'],
        content: 'Échale un ojo',
      });
    });
  });

  // 4. BookmarksView folder creation, moving posts, and keyboard-accessible reordering
  it('renders BookmarksView with folders and persists keyboard Up/Down reordering inside a folder', async () => {
    const folders: BookmarkFolder[] = [
      { id: 'fld-1', user_id: 'u-me', name: 'Favoritos', position: 0, items_count: 2, created_at: '', updated_at: '' },
    ];
    const entries: BookmarkEntry[] = [
      {
        id: 'bm-1', user_id: 'u-me', publication_id: 'pub-a', folder_id: 'fld-1', position: 0, created_at: '', updated_at: '',
        publication: makePost({ id: 'pub-a', content: 'Primero en carpeta', is_bookmarked: true }),
      },
      {
        id: 'bm-2', user_id: 'u-me', publication_id: 'pub-b', folder_id: 'fld-1', position: 1, created_at: '', updated_at: '',
        publication: makePost({ id: 'pub-b', content: 'Segundo en carpeta', is_bookmarked: true }),
      },
    ];

    vi.spyOn(ApiClient, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/bookmarks/folders')) return { success: true, data: folders } as any;
      if (endpoint.startsWith('/bookmarks')) return { success: true, data: { items: entries, hasMore: false } } as any;
      return { success: true, data: [] } as any;
    });
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/bookmarks?folder=fld-1']}>
        <QueryClientProvider client={qc}>
          <BookmarksView />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Primero en carpeta')).toBeInTheDocument();
    expect(screen.getByText('Segundo en carpeta')).toBeInTheDocument();

    const moveDownFirstBtn = screen.getByRole('button', { name: /Subir publicación \(posición 2\)/i });
    fireEvent.click(moveDownFirstBtn);

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith('/bookmarks/reorder', {
        folder_id: 'fld-1',
        ordered_publication_ids: ['pub-b', 'pub-a'],
      });
    });
  });

  // 7. Regression: Bookmark toast feedback + unseeded optimistic toggle + HTML response guard + Share2 icon + vite proxy
  it('shows save/unsave toast banner, reverts with error toast on failure, guards text/html in ApiClient, uses Share2 in PixelShare, and proxies /bookmarks in vite', async () => {
    // 7a. Vite proxy config includes /bookmarks
    const viteSrc = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');
    expect(viteSrc).toMatch(/['"]\^\/\([^'"]*bookmarks[^'"]*\)['"]/);

    // 7b. PixelShare uses Repeat2 and PublicationSendMenu uses Share2 (not Send paper plane)
    const { container } = render(<PixelShare active />);
    expect(container.querySelector('svg.lucide-repeat2[data-icon="share"]')).toBeInTheDocument();

    // 7c. ApiClient throws instead of returning {} when HTML fallback is returned
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
      json: async () => { throw new Error('Unexpected token <'); },
    } as any);
    await expect(ApiClient.get('/bookmarks')).rejects.toThrow(/respuesta inválida/i);
    fetchSpy.mockRestore();

    // 7d. Bookmark toggle works without prior identity-map seeding and shows success + error toasts
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValueOnce({ success: true, data: {} } as any);
    const deleteSpy = vi.spyOn(ApiClient, 'delete').mockRejectedValueOnce(new Error('Fallo de red'));

    const { container: actionsContainer } = render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <PublicationActions
            postId="unseeded-post-1"
            initialUpvotes={0}
            initialShares={0}
            initialIsBookmarked={false}
            commentsCount={0}
          />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(actionsContainer.querySelector('svg.lucide-share2[data-icon="send-menu"]')).toBeInTheDocument();
    expect(actionsContainer.querySelector('svg.lucide-send')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Guardar publicación/i }));
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/bookmarks', { publication_id: 'unseeded-post-1' });
      expect(useToastStore.getState().toast?.message).toBe('Publicación guardada');
      expect(useToastStore.getState().toast?.variant).toBe('success');
      expect(screen.getByRole('button', { name: /Quitar de guardados/i })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: /Quitar de guardados/i }));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/bookmarks/unseeded-post-1');
      expect(useToastStore.getState().toast?.message).toBe('Fallo de red');
      expect(useToastStore.getState().toast?.variant).toBe('error');
      expect(screen.getByRole('button', { name: /Quitar de guardados/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
