import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ProfileView } from '../src/views/ProfileView.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { insertOptimisticPublication } from '../src/controllers/optimisticPublicationCache.js';

function deferred<T>() {
  let resolve!: (val: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const makeUser = (overrides: Partial<PublicUser> & { id: string; username: string; name: string }): PublicUser => ({
  role: 'member',
  bio: null,
  location: null,
  link: null,
  icon_url: null,
  banner_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  follower_count: 5,
  followed_count: 2,
  publication_count: 1,
  ...overrides,
});

const makePost = (id: string, author: PublicUser, content: string): Publication => ({
  id,
  author: {
    id: author.id,
    username: author.username,
    name: author.name,
    role: author.role,
    icon_url: author.icon_url ?? null,
    banner_url: author.banner_url ?? null,
  },
  type: 'default',
  content,
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  upvotes_count: 0,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
});

const ProfileNavHarness: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate('/bob')}>
        Ir a Bob
      </button>
      <ProfileView />
    </div>
  );
};

describe('ProfileView Clean Reset, Local Cache SWR & Cross-Profile Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    userIdentityMap.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'viewer-1', username: 'viewer', name: 'Viewer', role: 'member' } as any,
    });
  });

  it('immediately clears previous user profile, banner, pinned post, and feed when navigating to an uncached user', async () => {
    const alice = makeUser({
      id: 'u-alice',
      username: 'alice',
      name: 'Alice Wonder',
      bio: 'Bio de Alice',
      banner_url: 'https://cdn.example.com/alice-banner.png',
    });
    const alicePinned = makePost('p-alice-pin', alice, 'Post fijado de Alice');
    alice.pinned_publication = alicePinned;
    const alicePost = makePost('p-alice-1', alice, 'Post exclusivo de Alice');

    const bob = makeUser({
      id: 'u-bob',
      username: 'bob',
      name: 'Bob Builder',
      bio: 'Bio de Bob',
      banner_url: 'https://cdn.example.com/bob-banner.png',
    });
    const bobPost = makePost('p-bob-1', bob, 'Post exclusivo de Bob');

    const bobProfileDeferred = deferred<{ success: boolean; data: PublicUser }>();
    const bobPostsDeferred = deferred<{ success: boolean; data: Publication[] }>();

    vi.spyOn(ApiClient, 'get').mockImplementation((endpoint: string) => {
      if (endpoint === '/members/alice') return Promise.resolve({ success: true, data: alice });
      if (endpoint.includes('author_username=alice')) return Promise.resolve({ success: true, data: [alicePost] });
      if (endpoint === '/members/bob') return bobProfileDeferred.promise;
      if (endpoint.includes('author_username=bob')) return bobPostsDeferred.promise;
      return Promise.resolve({ success: true, data: [] });
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/alice']}>
          <Routes>
            <Route path="/:username" element={<ProfileNavHarness />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getAllByText('Alice Wonder').length).toBeGreaterThan(0));
    expect(screen.getByText('Bio de Alice')).toBeInTheDocument();
    expect(screen.getByText('Post fijado de Alice')).toBeInTheDocument();
    expect(screen.getByText('Post exclusivo de Alice')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn.example.com/alice-banner.png"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ir a Bob' }));

    // Immediately after navigating to /bob (before network resolves): Alice's data MUST be gone
    expect(screen.queryByText('Alice Wonder')).toBeNull();
    expect(screen.queryByText('Bio de Alice')).toBeNull();
    expect(screen.queryByText('Post fijado de Alice')).toBeNull();
    expect(screen.queryByText('Post exclusivo de Alice')).toBeNull();
    expect(container.querySelector('img[src="https://cdn.example.com/alice-banner.png"]')).toBeNull();
    expect(screen.getByRole('status', { name: 'Cargando perfil' })).toBeInTheDocument();
    expect(screen.getByText('Cargando publicaciones...')).toBeInTheDocument();

    bobProfileDeferred.resolve({ success: true, data: bob });
    bobPostsDeferred.resolve({ success: true, data: [bobPost] });

    await waitFor(() => expect(screen.getAllByText('Bob Builder').length).toBeGreaterThan(0));
    expect(screen.getByText('Bio de Bob')).toBeInTheDocument();
    expect(screen.getByText('Post exclusivo de Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice Wonder')).toBeNull();
  });

  it('uses local cache immediately for the target user without leaking previous user, while fetching a fresh update in background', async () => {
    const alice = makeUser({ id: 'u-alice', username: 'alice', name: 'Alice Wonder', bio: 'Bio Alice' });
    const alicePost = makePost('p-alice-1', alice, 'Publicacion de Alice');

    const bobCached = makeUser({ id: 'u-bob', username: 'bob', name: 'Bob Cacheado', bio: 'Bio cacheada de Bob' });
    const bobCachedPost = makePost('p-bob-cached', bobCached, 'Post cacheado de Bob');
    userIdentityMap.ingest([bobCached], Date.now() - 10_000, true);
    publicationIdentityMap.ingest([bobCachedPost], Date.now() - 10_000);

    const bobFresh = makeUser({ id: 'u-bob', username: 'bob', name: 'Bob Actualizado', bio: 'Bio fresca de Bob' });
    const bobFreshPost = makePost('p-bob-fresh', bobFresh, 'Post fresco de Bob');
    const bobProfileDeferred = deferred<{ success: boolean; data: PublicUser }>();
    const bobPostsDeferred = deferred<{ success: boolean; data: Publication[] }>();

    const getSpy = vi.spyOn(ApiClient, 'get').mockImplementation((endpoint: string) => {
      if (endpoint === '/members/alice') return Promise.resolve({ success: true, data: alice });
      if (endpoint.includes('author_username=alice')) return Promise.resolve({ success: true, data: [alicePost] });
      if (endpoint === '/members/bob') return bobProfileDeferred.promise;
      if (endpoint.includes('author_username=bob')) return bobPostsDeferred.promise;
      return Promise.resolve({ success: true, data: [] });
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/alice']}>
          <Routes>
            <Route path="/:username" element={<ProfileNavHarness />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getAllByText('Alice Wonder').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Bob' }));

    // Immediately displays Bob's locally cached data with zero traces of Alice
    expect(screen.queryByText('Alice Wonder')).toBeNull();
    expect(screen.queryByText('Publicacion de Alice')).toBeNull();
    expect(screen.getAllByText('Bob Cacheado').length).toBeGreaterThan(0);
    expect(screen.getByText('Bio cacheada de Bob')).toBeInTheDocument();
    expect(screen.getByText('Post cacheado de Bob')).toBeInTheDocument();

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/members/bob');
      expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('author_username=bob'));
    });

    bobProfileDeferred.resolve({ success: true, data: bobFresh });
    bobPostsDeferred.resolve({ success: true, data: [bobFreshPost] });

    await waitFor(() => expect(screen.getAllByText('Bob Actualizado').length).toBeGreaterThan(0));
    expect(screen.getByText('Bio fresca de Bob')).toBeInTheDocument();
    expect(screen.getByText('Post fresco de Bob')).toBeInTheDocument();
  });

  it('does not prepend optimistic publications into another user profile cache', () => {
    const qc = new QueryClient();
    const alice = makeUser({ id: 'u-alice', username: 'alice', name: 'Alice' });
    const bob = makeUser({ id: 'u-bob', username: 'bob', name: 'Bob' });
    const bobPost = makePost('p-bob-1', bob, 'Post de Bob');
    const aliceNewPost = makePost('p-alice-new', alice, 'Nuevo post de Alice');

    qc.setQueryData(['user-posts', 'alice', 'posts'], {
      pages: [{ success: true, data: [] }],
      pageParams: [null],
    });
    qc.setQueryData(['user-posts', 'bob', 'posts'], {
      pages: [{ success: true, data: [bobPost] }],
      pageParams: [null],
    });

    insertOptimisticPublication(qc, aliceNewPost);

    const alicePosts = (qc.getQueryData(['user-posts', 'alice', 'posts']) as any).pages[0].data;
    const bobPosts = (qc.getQueryData(['user-posts', 'bob', 'posts']) as any).pages[0].data;
    expect(alicePosts.map((p: Publication) => p.id)).toContain('p-alice-new');
    expect(bobPosts.map((p: Publication) => p.id)).toEqual(['p-bob-1']);
  });
});
