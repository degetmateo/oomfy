import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationCard } from './PublicationCard.js';
import { Publication } from '@oomfy/shared';

describe('PublicationCard Component', () => {
  const queryClient = new QueryClient();
  const dummyPost: Publication = {
    id: '019e6d84-f0de-74f8-8517-bbb2824111a6',
    author: {
      id: 'author-123',
      username: 'pixeldev',
      name: 'Pixel Master',
      role: 'admin',
      icon_url: null,
      banner_url: null,
    },
    type: 'default',
    content: 'Probando el diseño retro pixel de oomfy!',
    created_at: new Date().toISOString(),
    parent_publication_id: null,
    root_publication_id: null,
    upvotes_count: 42,
    shares_count: 5,
    quotes_count: 1,
    comments_count: 3,
  };

  it('renders author information, badges and content', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PublicationCard post={dummyPost} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Pixel Master')).toBeInTheDocument();
    expect(screen.getByText('@pixeldev')).toBeInTheDocument();
    expect(screen.getByText('[ADMIN]')).toBeInTheDocument();
    expect(screen.getByText('Probando el diseño retro pixel de oomfy!')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

