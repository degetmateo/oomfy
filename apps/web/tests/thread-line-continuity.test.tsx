import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { SubthreadPreviewItem } from '../src/components/publication/SubthreadPreviewItem.js';
import { AuthorThreadPreview } from '../src/components/publication/AuthorThreadPreview.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { ThreadAncestorCard } from '../src/components/publication/ThreadAncestorCard.js';

const dummyPost = (id: string): Publication => ({
  id, author: { id: `u-${id}`, username: `user_${id}`, name: `User ${id}`, role: 'member', icon_url: null, banner_url: null },
  type: 'default', content: `Post ${id}`, created_at: new Date().toISOString(),
  parent_publication_id: null, root_publication_id: null, images: [], embeds: [],
  upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
});

describe('Thread Connecting Line Alignment and Continuity', () => {
  const qc = new QueryClient();

  it('ensures SubthreadPreviewItem uses fixed w-12 column and gap-3 across breakpoints', () => {
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><SubthreadPreviewItem item={dummyPost('1')} connectTop connectBottom /></MemoryRouter>
      </QueryClientProvider>
    );
    const itemContainer = container.firstElementChild as HTMLElement;
    expect(itemContainer.className).toContain('gap-3');
    expect(itemContainer.className).not.toContain('gap-2.5');

    const avatarCol = itemContainer.querySelector('.w-12') as HTMLElement;
    expect(avatarCol).toBeInTheDocument();
    expect(avatarCol.className).not.toContain('w-10');
  });

  it('ensures PublicationCard has w-12 column and sm:pb-2 when thread is active', () => {
    const root = { ...dummyPost('root'), author_thread_preview: [dummyPost('sub1')] };
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><PublicationCard post={root} /></MemoryRouter>
      </QueryClientProvider>
    );
    const article = container.querySelector('article') as HTMLElement;
    expect(article.className).toContain('pb-2 sm:pb-2');
    const avatarCol = article.querySelector('.w-12') as HTMLElement;
    expect(avatarCol).toBeInTheDocument();
  });

  it('ensures AuthorThreadPreview dashed indicator has negative margin top to prevent cut off gap', () => {
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AuthorThreadPreview rootPostId="root" initialItems={[dummyPost('sub1')]} initialRemaining={3} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const dashedLine = container.querySelector('.border-dashed') as HTMLElement;
    expect(dashedLine).toBeInTheDocument();
    expect(dashedLine.className).toContain('-mt-1');
  });

  it('ensures ThreadAncestorCard has w-12 column and renders top connecting line when showTopLine is true', () => {
    const { container } = render(
      <MemoryRouter>
        <ThreadAncestorCard post={dummyPost('anc')} showTopLine={true} showBottomLine={true} />
      </MemoryRouter>
    );
    const avatarCol = container.querySelector('.w-12') as HTMLElement;
    expect(avatarCol).toBeInTheDocument();
    const topLine = avatarCol.querySelector('.-mt-3') as HTMLElement;
    expect(topLine).toBeInTheDocument();
  });
});
