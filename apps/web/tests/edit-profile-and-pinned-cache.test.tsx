import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ProfileView } from '../src/views/ProfileView.js';
import { ProfileFeed } from '../src/components/profile/ProfileFeed.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { applyEntitiesSnapshot, saveBootEntitiesSync, readBootEntitiesSync, clearBootEntitiesSync } from '../src/services/localPersistenceHelpers.js';

const makeUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: 'u-self', username: 'selfuser', name: 'Self User', role: 'member',
  bio: 'Bio', location: null, link: null, icon_url: null, banner_url: null,
  created_at: '2026-01-01T00:00:00.000Z', follower_count: 1, followed_count: 1, publication_count: 1,
  ...overrides,
});

const makePost = (id: string, content: string): Publication => ({
  id, author: { id: 'u-self', username: 'selfuser', name: 'Self User', role: 'member', icon_url: null, banner_url: null },
  type: 'default', content, created_at: '2026-11-01T00:00:00.000Z',
  parent_publication_id: null, root_publication_id: null,
  upvotes_count: 2, shares_count: 1, quotes_count: 0, comments_count: 0,
});

describe('EditProfileModal Close Duplication Fix & Pinned Publication Caching', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearBootEntitiesSync();
    userIdentityMap.clear();
    publicationIdentityMap.clear();
  });

  it('does not duplicate ProfileInfo when opening and closing EditProfileModal repeatedly', async () => {
    const me = makeUser();
    useAuthStore.setState({ isAuthenticated: true, user: me });
    userIdentityMap.ingest([me], Date.now(), true);
    vi.spyOn(ApiClient, 'get').mockImplementation(async (url) => {
      if (url.startsWith('/members/')) return { success: true, data: me };
      return { success: true, data: [] };
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/selfuser']}>
          <Routes><Route path="/:username" element={<ProfileView />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Editar perfil/i })).toHaveLength(1));

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getAllByRole('button', { name: /Editar perfil/i })).toHaveLength(1);
      expect(screen.getAllByText('@selfuser')).toHaveLength(1);
    }
  });

  it('preserves cached pinned_publication across undecorated ingests, clears on unpin/delete, and renders immediately while loadingPosts', () => {
    const pinned = makePost('pin-1', 'Publicación fijada instantánea');
    const u = makeUser({ pinned_publication_id: 'pin-1', pinned_publication: pinned });

    userIdentityMap.ingest([u], 1000, true);
    expect(publicationIdentityMap.get('pin-1')?.content).toBe('Publicación fijada instantánea');

    // Undecorated list ingest with same pinned_publication_id must NOT overwrite pinned_publication with null
    userIdentityMap.ingest([{ ...u, pinned_publication: null }], 2000, false);
    expect(userIdentityMap.get('selfuser')?.pinned_publication?.id).toBe('pin-1');

    // Boot storage round-trip strips full tree from boot user but restores via seeded publications
    saveBootEntitiesSync('scope1', { savedAt: Date.now(), publications: [], users: [userIdentityMap.get('selfuser')!] });
    const bootRaw = readBootEntitiesSync('scope1');
    expect(bootRaw?.users[0].pinned_publication).toBeNull();

    userIdentityMap.clear();
    publicationIdentityMap.clear();
    applyEntitiesSnapshot(bootRaw);
    expect(userIdentityMap.get('selfuser')?.pinned_publication?.id).toBe('pin-1');

    // ProfileFeed renders pinned post immediately even while loadingPosts is true
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProfileFeed activeTab="posts" posts={[]} pinnedPublication={pinned} pinnedByName="Self User" loadingPosts={true} isFetchingNextPage={false} loadMoreRef={React.createRef()} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Publicación fijada instantánea')).toBeInTheDocument();
    expect(screen.getByText('Cargando publicaciones...')).toBeInTheDocument();

    // Deleting pinned publication clears it from userIdentityMap; unpinning clears it too
    publicationIdentityMap.remove('pin-1');
    expect(userIdentityMap.get('selfuser')?.pinned_publication_id).toBeNull();
    expect(userIdentityMap.get('selfuser')?.pinned_publication).toBeNull();

    userIdentityMap.ingest([{ ...u, pinned_publication_id: 'pin-2', pinned_publication: pinned }], 3000, true);
    userIdentityMap.ingest([{ ...u, pinned_publication_id: null, pinned_publication: null }], 4000, true);
    expect(userIdentityMap.get('selfuser')?.pinned_publication).toBeNull();
  });
});
