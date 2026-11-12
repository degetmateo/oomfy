import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Quoted Embedded Publication Navigation', () => {
  const queryClient = new QueryClient();
  const quotedPost: Publication = {
    id: 'pub-quoted-99',
    type: 'default',
    content: 'Publicacion original citada',
    author: { id: 'u2', username: 'quotedauthor', name: 'Quoted Author', role: 'member', icon_url: null, banner_url: null },
    created_at: new Date().toISOString(),
    parent_publication_id: null,
    root_publication_id: null,
    images: [{ url: 'https://i.ibb.co/quoted.png', source: 'imgbb', index: 0 }],
    upvotes_count: 2, shares_count: 0, quotes_count: 0, comments_count: 0,
  };
  const outerPost: Publication = {
    id: 'pub-outer-1',
    type: 'quote',
    content: 'Comentando la cita',
    author: { id: 'u1', username: 'outerauthor', name: 'Outer Author', role: 'member', icon_url: null, banner_url: null },
    created_at: new Date().toISOString(),
    parent_publication_id: quotedPost.id,
    root_publication_id: quotedPost.id,
    upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 0,
    target_publication: quotedPost,
  };

  beforeEach(() => mockNavigate.mockClear());

  it('navigates to the quoted publication on clean click without navigating to outer post', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PublicationCard post={outerPost} /></MemoryRouter>
      </QueryClientProvider>
    );

    const quotedText = screen.getByText('Publicacion original citada');
    fireEvent.mouseDown(quotedText, { clientX: 50, clientY: 50 });
    fireEvent.click(quotedText, { clientX: 50, clientY: 50 });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/publication/pub-quoted-99');
  });

  it('opens ImageViewerModal instead of navigating when clicking quoted media', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PublicationCard post={outerPost} /></MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByAltText('Adjunto de publicación'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

