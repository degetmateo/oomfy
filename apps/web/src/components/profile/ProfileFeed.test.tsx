import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { ProfileFeed } from './ProfileFeed.js';

const makePost = (id: string, content: string, previews: Publication[] = []): Publication => ({
  id,
  author: { id: 'u1', username: 'author1', name: 'Author One', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content,
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  upvotes_count: 0,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
  author_thread_preview: previews.length > 0 ? previews : undefined,
  author_thread_remaining_count: previews.length,
});

describe('ProfileFeed Component (Thread preview suppression in likes tab)', () => {
  const qc = new QueryClient();
  const subthreadPost = makePost('p2', 'Continuacion del autor');
  const mainPost = makePost('p1', 'Publicacion que me gusta', [subthreadPost]);

  it('renders author thread preview when activeTab is posts', () => {
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProfileFeed activeTab="posts" posts={[mainPost]} loadingPosts={false} isFetchingNextPage={false} loadMoreRef={React.createRef()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Publicacion que me gusta')).toBeInTheDocument();
    expect(screen.getByText('Continuacion del autor')).toBeInTheDocument();
  });

  it('does NOT render thread preview when activeTab is likes, showing only the liked post', () => {
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProfileFeed activeTab="likes" posts={[mainPost]} loadingPosts={false} isFetchingNextPage={false} loadMoreRef={React.createRef()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Publicacion que me gusta')).toBeInTheDocument();
    expect(screen.queryByText('Continuacion del autor')).toBeNull();
  });
});
