import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThreadAncestorsList } from './ThreadAncestorsList.js';
import { ApiClient } from '../../services/api.js';
import { Publication } from '@oomfy/shared';

vi.mock('../../services/api.js', () => ({ ApiClient: { get: vi.fn() } }));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as any;

describe('ThreadAncestorsList Component', () => {
  const sampleAncestor: Publication = {
    id: 'anc-1',
    author: { id: 'author-1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
    type: 'default', content: 'Root ancestor post', created_at: new Date().toISOString(),
    parent_publication_id: null, root_publication_id: null, thread_ids: [],
    images: [], embeds: [], upvotes_count: 1, shares_count: 0, quotes_count: 0,
    comments_count: 0, is_upvoted: false, is_shared: false, target_publication: null,
  };
  const sampleEarlier: Publication = { ...sampleAncestor, id: 'anc-0', content: 'Even earlier ancestor in thread' };

  beforeEach(() => vi.clearAllMocks());

  it('renders initial ancestors without pagination button when hasMore is false', () => {
    render(
      <MemoryRouter>
        <ThreadAncestorsList publicationId="current-post-id" initialAncestors={[sampleAncestor]} hasMoreInitial={false} totalAncestors={1} />
      </MemoryRouter>
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Root ancestor post')).toBeInTheDocument();
    expect(screen.queryByText(/Mostrar publicaciones anteriores/)).toBeNull();
  });

  it('shows button to load earlier thread publications when hasMoreInitial is true', async () => {
    (ApiClient.get as any).mockResolvedValueOnce({ data: { ancestors: [sampleEarlier], has_more: false, remaining: 0 } });
    render(
      <MemoryRouter>
        <ThreadAncestorsList publicationId="current-post-id" initialAncestors={[sampleAncestor]} hasMoreInitial={true} totalAncestors={2} />
      </MemoryRouter>
    );
    const button = screen.getByText(/Mostrar publicaciones anteriores/);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    await waitFor(() => {
      expect(ApiClient.get).toHaveBeenCalledWith('/publications/current-post-id/ancestors?before_id=anc-1&limit=4');
      expect(screen.getByText('Even earlier ancestor in thread')).toBeInTheDocument();
    });
  });
});
