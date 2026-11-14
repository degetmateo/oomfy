import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationMenu } from '../src/components/publication/PublicationMenu.js';
import { ProfileFeed } from '../src/components/profile/ProfileFeed.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';
import { ApiClient } from '../src/services/api.js';

describe('Pinned Publication Frontend Flow', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const samplePost: Publication = {
    id: 'post-pin-1',
    author: { id: 'auth-1', username: 'author1', name: 'Author One', role: 'member', icon_url: null, banner_url: null },
    type: 'default', content: 'Post to pin', created_at: new Date().toISOString(),
    parent_publication_id: null, root_publication_id: null,
    upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-pin-test', username: 'pinner', name: 'Pinner Name', role: 'member', pinned_publication_id: null } as any,
    });
  });

  it('asks confirmation popup before pinning, and calls API on confirm', async () => {
    const confirmSpy = vi.spyOn(useDialogStore.getState(), 'confirm').mockResolvedValue(true);
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true, pinned_publication_id: 'post-pin-1' });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PublicationMenu postId="post-pin-1" authorId="auth-1" authorUsername="author1" canDelete={false} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTitle('Opciones de publicación'));
    const pinBtn = screen.getByText('Fijar en tu perfil');
    expect(pinBtn).toBeInTheDocument();
    fireEvent.click(pinBtn);

    expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Fijar en tu perfil',
      message: '¿Estás seguro de que deseas fijar esta publicación en tu perfil?',
    }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/publications/post-pin-1/pin');
      expect(useAuthStore.getState().user?.pinned_publication_id).toBe('post-pin-1');
    });
  });

  it('renders "fijado por [nombre]" above pinned post in ProfileFeed and deduplicates in posts tab', () => {
    const regularPost: Publication = { ...samplePost, id: 'post-reg-2', content: 'Regular post' };
    const loadMoreRef = React.createRef<HTMLDivElement>();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProfileFeed activeTab="posts" posts={[samplePost, regularPost]} pinnedPublication={samplePost} pinnedByName="Pinner Name" loadingPosts={false} isFetchingNextPage={false} loadMoreRef={loadMoreRef} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/fijado por Pinner Name/i)).toBeInTheDocument();
    expect(screen.getByText('Post to pin')).toBeInTheDocument();
    expect(screen.getByText('Regular post')).toBeInTheDocument();
    expect(screen.getAllByText('Post to pin')).toHaveLength(1);

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProfileFeed activeTab="replies" posts={[regularPost]} pinnedPublication={samplePost} pinnedByName="Pinner Name" loadingPosts={false} isFetchingNextPage={false} loadMoreRef={loadMoreRef} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByText(/fijado por Pinner Name/i)).not.toBeInTheDocument();
  });
});
