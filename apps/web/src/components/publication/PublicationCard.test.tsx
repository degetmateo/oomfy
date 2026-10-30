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

  it('renders shared publication correctly with original content and reposter line', () => {
    const sharedPost: Publication = {
      id: '019e6d84-f0de-74f8-8517-shared111111',
      author: {
        id: 'reposter-999',
        username: 'reposter_user',
        name: 'Reposter User',
        role: 'member',
        icon_url: null,
        banner_url: null,
      },
      type: 'shared',
      content: '',
      created_at: new Date().toISOString(),
      parent_publication_id: dummyPost.id,
      root_publication_id: null,
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
      target_publication: dummyPost,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PublicationCard post={sharedPost} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Compartido por @reposter_user')).toBeInTheDocument();
    expect(screen.getByText('Pixel Master')).toBeInTheDocument();
    expect(screen.getByText('@pixeldev')).toBeInTheDocument();
    expect(screen.getByText('Probando el diseño retro pixel de oomfy!')).toBeInTheDocument();
  });

  it('renders reply with correct target publication author username', () => {
    const replyPost: Publication = {
      id: '019e6d84-f0de-74f8-8517-reply111111',
      author: {
        id: 'replier-1',
        username: 'replier_user',
        name: 'Replier',
        role: 'member',
        icon_url: null,
        banner_url: null,
      },
      type: 'reply',
      content: 'Esta es una respuesta',
      created_at: new Date().toISOString(),
      parent_publication_id: dummyPost.id,
      root_publication_id: dummyPost.id,
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
      target_publication: dummyPost,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PublicationCard post={replyPost} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('En respuesta a')).toBeInTheDocument();
    expect(screen.getByText('@pixeldev')).toBeInTheDocument();
  });
});

