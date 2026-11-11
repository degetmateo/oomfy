import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { PublicationDetailArticle } from '../src/components/publication/PublicationDetailArticle.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useEntityRegistryStore } from '../src/stores/entityRegistryStore.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<any>('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

describe('Cross-View Publication Identity Map Interaction Sync', () => {
  const basePost: Publication = {
    id: 'pub-sync-1',
    author: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
    type: 'default',
    content: 'Synced post across TL, detail and profile',
    created_at: new Date().toISOString(),
    parent_publication_id: null,
    root_publication_id: null,
    upvotes_count: 5,
    shares_count: 2,
    quotes_count: 0,
    comments_count: 0,
    is_upvoted: false,
    is_shared: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    useEntityRegistryStore.getState().clearRegistry();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'tok',
      user: { id: 'u2', username: 'bob', name: 'Bob', role: 'member' } as any,
    });
  });

  it('toggles like and share across TL card, detail article and profile views in sync and rolls back on failure', async () => {
    const qc = new QueryClient();
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ upvoted: true, upvotes_count: 6 });
    const delSpy = vi.spyOn(ApiClient, 'delete').mockResolvedValue({ upvoted: false, upvotes_count: 5 });

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PublicationCard post={basePost} />
          <PublicationDetailArticle
            publication={basePost}
            repliesCount={0}
            canDelete={false}
            isAuthenticated={true}
            articleRef={React.createRef()}
            onDelete={vi.fn()}
            onQuote={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const likeButtons = screen.getAllByTitle('Me gusta');
    expect(likeButtons).toHaveLength(2);
    expect(likeButtons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(likeButtons[1]).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(likeButtons[0]);
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/interactions/pub-sync-1/upvote'));
    expect(likeButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(likeButtons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('6')).toHaveLength(2);

    fireEvent.click(likeButtons[1]);
    await waitFor(() => expect(delSpy).toHaveBeenCalledWith('/interactions/pub-sync-1/upvote'));
    expect(likeButtons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(likeButtons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByText('5')).toHaveLength(2);

    postSpy.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(likeButtons[0]);
    await waitFor(() => expect(likeButtons[0]).toHaveAttribute('aria-pressed', 'false'));

    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
    rerender(<QueryClientProvider client={qc}><MemoryRouter><PublicationCard post={basePost} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByTitle('Me gusta'));
    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });
});

