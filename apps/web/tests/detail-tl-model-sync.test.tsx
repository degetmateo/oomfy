import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { PublicationDetailArticle } from '../src/components/publication/PublicationDetailArticle.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { collectPublications } from '../src/stores/entityMergeHelpers.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Detail & TL Model Synchronization', () => {
  const mainPost: Publication = {
    id: 'post-detail-sync-1',
    author: { id: 'u1', username: 'author1', name: 'Author One', role: 'member', icon_url: null, banner_url: null },
    type: 'default', content: 'Main post content', created_at: new Date().toISOString(),
    parent_publication_id: null, root_publication_id: null,
    upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 1,
    is_upvoted: true, is_shared: false,
  };

  const staleReply: Publication = {
    id: 'reply-detail-sync-2',
    author: { id: 'u2', username: 'replier', name: 'Replier', role: 'member', icon_url: null, banner_url: null },
    type: 'reply', content: 'A reply to main post', created_at: new Date().toISOString(),
    parent_publication_id: mainPost.id, root_publication_id: mainPost.id,
    upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
    target_publication: { ...mainPost, upvotes_count: 0, comments_count: 0 },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'tok-123',
      user: { id: 'u1', username: 'author1', name: 'Author One', role: 'member' } as any,
    });
  });

  it('collectPublications prevents nested reply target_publication from downgrading main post counters', () => {
    const collected = collectPublications([mainPost, staleReply]);
    const stored = collected.get(mainPost.id.toLowerCase());
    expect(stored?.upvotes_count).toBe(1);
    expect(stored?.comments_count).toBe(1);
    expect(stored?.is_upvoted).toBe(true);
  });

  it('renders 1 comment and 1 like consistently across both TL PublicationCard and PublicationDetailArticle', () => {
    const qc = new QueryClient();
    publicationIdentityMap.seed([mainPost]);

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <div data-testid="tl-container"><PublicationCard post={mainPost} /></div>
          <div data-testid="detail-container">
            <PublicationDetailArticle
              publication={mainPost}
              repliesCount={1}
              canDelete={false}
              isAuthenticated={true}
              articleRef={React.createRef()}
              onDelete={vi.fn()}
              onQuote={vi.fn()}
            />
          </div>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const likeButtons = screen.getAllByTitle('Me gusta');
    expect(likeButtons).toHaveLength(2);
    for (const btn of likeButtons) {
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn).toHaveTextContent('1');
    }

    const commentButtons = screen.getAllByTitle('Comentar');
    expect(commentButtons).toHaveLength(2);
    for (const btn of commentButtons) {
      expect(btn).toHaveTextContent('1');
    }
  });
});
