import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { ProfileMediaGrid } from './ProfileMediaGrid.js';

const basePost = (id: string, images: Publication['images']): Publication => ({
  id,
  author: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content: 'media post',
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images,
  embeds: [],
  upvotes_count: 0,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
});

describe('ProfileMediaGrid', () => {
  it('renders media tiles in a 3-column grid linking directly to the source publication', () => {
    const posts: Publication[] = [
      basePost('pub-101', [
        { url: 'https://cdn.example.com/a.png', source: 'imgbb', index: 0 },
        { url: 'https://cdn.example.com/b.gif', source: 'tenor', index: 1, is_gif: true },
      ]),
      basePost('pub-202', [
        { url: 'https://cdn.example.com/c.png', source: 'imgbb', index: 0, warning: 'spoiler' },
      ]),
    ];

    const { container } = render(
      <MemoryRouter>
        <ProfileMediaGrid posts={posts} loadingPosts={false} isFetchingNextPage={false} loadMoreRef={{ current: null }} />
      </MemoryRouter>
    );

    const grid = container.querySelector('.grid-cols-3');
    expect(grid).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/publication/pub-101');
    expect(links[1]).toHaveAttribute('href', '/publication/pub-101');
    expect(links[2]).toHaveAttribute('href', '/publication/pub-202');

    expect(screen.getByText('GIF')).toBeInTheDocument();
    expect(screen.getByText('Spoiler')).toBeInTheDocument();
  });

  it('shows empty state when the user has no uploaded media', () => {
    render(
      <MemoryRouter>
        <ProfileMediaGrid posts={[]} loadingPosts={false} isFetchingNextPage={false} loadMoreRef={{ current: null }} />
      </MemoryRouter>
    );
    expect(screen.getByText('No hay contenido multimedia todavía.')).toBeInTheDocument();
  });
});
