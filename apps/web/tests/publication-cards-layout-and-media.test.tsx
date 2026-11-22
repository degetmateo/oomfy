import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { MediaGrid } from '../src/components/publication/MediaGrid.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { ThreadAncestorCard } from '../src/components/publication/ThreadAncestorCard.js';
import { SubthreadPreviewItem } from '../src/components/publication/SubthreadPreviewItem.js';
import { SharedPublicationCard } from '../src/components/publication/SharedPublicationCard.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useUIStore } from '../src/stores/uiStore.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';

const makePost = (overrides: Partial<Publication> = {}): Publication => ({
  id: 'card-test-1',
  author: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content: 'Texto legible en móvil y desktop',
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

describe('Publication Cards Unified Spacing, Mobile Thread Typography & Full-Bleed MediaGrid', () => {
  const qc = new QueryClient();

  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'viewer-1', username: 'viewer', name: 'Viewer', role: 'member' } as any,
    });
  });

  it('fills 100% of single and multi-image MediaGrid slots with object-cover and proper LCP fetchpriority', () => {
    const img1 = [{ url: 'https://cdn.example.com/1.jpg', source: 'imgbb' as const, index: 0 }];
    const { container, rerender } = render(<MediaGrid images={img1} priority />);
    let imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].className).toContain('object-cover');
    expect(imgs[0].className).toContain('w-full');
    expect(imgs[0].className).not.toContain('object-contain');
    expect(imgs[0].getAttribute('loading')).toBe('eager');
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high');

    const img3 = [
      { url: 'https://cdn.example.com/1.jpg', source: 'imgbb' as const, index: 0 },
      { url: 'https://cdn.example.com/2.jpg', source: 'imgbb' as const, index: 1 },
      { url: 'https://cdn.example.com/3.jpg', source: 'imgbb' as const, index: 2 },
    ];
    rerender(<MediaGrid images={img3} />);
    const grid = container.querySelector('.grid-cols-2') as HTMLElement;
    expect(grid.className).toContain('grid-rows-2');
    expect(grid.className).toContain('aspect-[16/9]');
    imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(3);
    for (const img of Array.from(imgs)) {
      expect(img.className).toContain('object-cover');
      expect(img.className).toContain('h-full');
      expect(img.className).not.toContain('max-h-80');
      expect(img.getAttribute('fetchpriority')).toBeNull();
    }
  });

  it('uses comfortable mobile text-base sizing and vertical gap-3 rhythm across card, thread reply, and ancestor', () => {
    const post = makePost();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PublicationCard post={{ ...post, id: 'c1', content: 'Texto feed' }} />
          <ThreadAncestorCard post={{ ...post, id: 'c2', content: 'Texto ancestro' }} />
          <SubthreadPreviewItem item={{ ...post, id: 'c3', content: 'Texto subhilo' }} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    for (const text of ['Texto feed', 'Texto ancestro', 'Texto subhilo']) {
      const el = screen.getByText(text);
      expect(el.className).toContain('text-base');
      expect(el.className).toContain('leading-[1.5]');
      expect(el.className).not.toContain('text-xs');
      expect(el.parentElement?.className).toContain('gap-3');
    }
  });

  it('wires quote modal action on SharedPublicationCard original publication', () => {
    const original = makePost({ id: 'orig-q-1', content: 'Original citable' });
    const shared = makePost({ id: 'sh-1', type: 'shared', content: null, target_publication: original });
    const openSpy = vi.fn();
    useUIStore.setState({ openPostModal: openSpy });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <SharedPublicationCard post={shared} canDelete={false} onDelete={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTitle('Citar'));
    expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'orig-q-1' }));
  });
});
