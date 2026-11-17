import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { ReplyThreadGroup } from '../src/components/publication/ReplyThreadGroup.js';
import { ApiClient } from '../src/services/api.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';

const mkPost = (id: string, username: string, content: string, authorId = `u-${username}`): Publication => ({
  id, author: { id: authorId, username, name: username, role: 'member', icon_url: null, banner_url: null },
  type: 'reply', content, created_at: new Date().toISOString(),
  parent_publication_id: null, root_publication_id: null, images: [], embeds: [],
  upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
});

describe('Dynamic Thread Preview & Inline Sub-Thread UI', () => {
  beforeEach(() => { vi.restoreAllMocks(); publicationIdentityMap.clear(); });

  it('renders author self-thread preview in feed and loads remaining replies on click', async () => {
    const p1 = mkPost('p1', 'ada', 'Continuación 1 del hilo');
    const p2 = mkPost('p2', 'ada', 'Continuación 2 del hilo');
    const p3 = mkPost('p3', 'ada', 'Continuación 3 expandida');
    const p4 = mkPost('p4', 'ada', 'Continuación 4 expandida');
    const root: Publication = {
      ...mkPost('p0', 'ada', 'Publicación principal del hilo'),
      type: 'default', author_thread_preview: [p1, p2], author_thread_remaining_count: 2,
    };

    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValueOnce({
      success: true, data: { items: [p3, p4], remaining: 0, has_more: false },
    });

    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MemoryRouter><PublicationCard post={root} /></MemoryRouter></QueryClientProvider>);

    expect(screen.getByText('Publicación principal del hilo')).toBeInTheDocument();
    expect(screen.getByText('Continuación 1 del hilo')).toBeInTheDocument();
    expect(screen.getByText('Continuación 2 del hilo')).toBeInTheDocument();
    const expandBtn = screen.getByRole('button', { name: /Y 2 respuestas más/i });
    fireEvent.click(expandBtn);

    await waitFor(() => expect(screen.getByText('Continuación 3 expandida')).toBeInTheDocument());
    expect(screen.getByText('Continuación 4 expandida')).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith('/publications/p0/subthread?mode=author&offset=2&limit=4');
    expect(screen.queryByRole('button', { name: /respuestas más/i })).toBeNull();
  });

  it('renders inline subthreads in reply group, marks original author reply, and loads more inline', async () => {
    const sub1 = mkPost('s1', 'orig_author', 'Respuesta del autor original', 'u-orig');
    const sub2 = mkPost('s2', 'replier_1', 'Réplica siguiente');
    const sub3 = mkPost('s3', 'replier_1', 'Tercera respuesta del subhilo');
    const reply: Publication = {
      ...mkPost('r1', 'replier_1', 'Comentario inicial sobre el tema'),
      has_author_reply: true, subthread_preview: [sub1, sub2], subthread_remaining_count: 1,
    };

    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValueOnce({
      success: true, data: { items: [sub3], remaining: 0, has_more: false },
    });

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}><MemoryRouter>
        <ReplyThreadGroup reply={reply} rootAuthorId="u-orig" rootAuthorUsername="orig_author" />
      </MemoryRouter></QueryClientProvider>
    );

    expect(screen.getByText(/Respondido por @orig_author en este hilo/i)).toBeInTheDocument();
    expect(screen.getByText('Autor')).toBeInTheDocument();
    expect(screen.getByText('Respuesta del autor original')).toBeInTheDocument();
    const moreBtn = screen.getByRole('button', { name: /Mostrar más respuestas/i });
    fireEvent.click(moreBtn);

    await waitFor(() => expect(screen.getByText('Tercera respuesta del subhilo')).toBeInTheDocument());
    expect(getSpy).toHaveBeenCalledWith('/publications/r1/subthread?mode=subthread&offset=2&limit=5');
  });
});
