import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { formatRelativeTime, formatExactDateTime } from '../src/utils/formatTime.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { PublicationDetailArticle } from '../src/components/publication/PublicationDetailArticle.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Publication Time Formatting & Interaction Guards', () => {
  const queryClient = new QueryClient();
  const baseTime = new Date('2026-11-10T12:00:00Z').getTime();

  const makePost = (overrides: Partial<Publication> = {}): Publication => ({
    id: 'pub-1', type: 'default', content: 'Texto seleccionable de prueba en Oomfy',
    author: { id: 'u1', username: 'mateo', name: 'Mateo', role: 'member', icon_url: null, banner_url: null },
    created_at: new Date(Date.now() - 86400 * 1000 - 1000).toISOString(),
    parent_publication_id: null, root_publication_id: null,
    images: [{ url: 'https://i.ibb.co/test.gif', source: 'imgbb', index: 0 }],
    upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 0, ...overrides,
  });

  beforeEach(() => { mockNavigate.mockClear(); vi.restoreAllMocks(); });

  it('formats relative time strictly using completed floor units', () => {
    expect(formatRelativeTime(new Date(baseTime - 1500), baseTime)).toBe('1s');
    expect(formatRelativeTime(new Date(baseTime - 245000), baseTime)).toBe('4min');
    expect(formatRelativeTime(new Date(baseTime - 3600000), baseTime)).toBe('1h');
    expect(formatRelativeTime(new Date(baseTime - 24 * 3600000), baseTime)).toBe('1d');
    expect(formatRelativeTime(new Date(baseTime - 47 * 3600000), baseTime)).toBe('1d');
    expect(formatRelativeTime(new Date(baseTime - 48 * 3600000), baseTime)).toBe('2d');
  });

  it('renders relative age in PublicationCard and exact date with timezone in PublicationDetailArticle', () => {
    const post = makePost();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PublicationCard post={post} />
          <PublicationDetailArticle publication={post} repliesCount={0} canDelete={false} isAuthenticated={false} articleRef={{ current: null } as any} onDelete={vi.fn()} onQuote={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('• 1d')).toBeInTheDocument();
    expect(screen.getByText(formatExactDateTime(post.created_at))).toBeInTheDocument();
  });

  it('does NOT navigate when text is highlighted or mouse dragged, only on clean click', () => {
    const post = makePost({ images: [] });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PublicationCard post={post} /></MemoryRouter>
      </QueryClientProvider>
    );

    const textEl = screen.getByText(post.content!);
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'Texto seleccionable' } as any);
    fireEvent.mouseDown(textEl, { clientX: 10, clientY: 10 });
    fireEvent.click(textEl, { clientX: 90, clientY: 10 });
    expect(mockNavigate).not.toHaveBeenCalled();

    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '' } as any);
    fireEvent.mouseDown(textEl, { clientX: 20, clientY: 20 });
    fireEvent.click(textEl, { clientX: 21, clientY: 20 });
    expect(mockNavigate).toHaveBeenCalledWith('/publication/pub-1');
  });

  it('opens ImageViewerModal on image/GIF click and closes without navigating to publication', () => {
    const post = makePost();
    render(<QueryClientProvider client={queryClient}><MemoryRouter><PublicationCard post={post} /></MemoryRouter></QueryClientProvider>);

    fireEvent.click(screen.getByAltText('Adjunto de publicación'));
    expect(mockNavigate).not.toHaveBeenCalled();

    const closeBtn = screen.getByTitle('Cerrar (Esc)');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
