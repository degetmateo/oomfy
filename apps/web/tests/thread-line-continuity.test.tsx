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
import { ReplyThreadGroup } from '../src/components/publication/ReplyThreadGroup.js';

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

  it('does not draw connecting line between disjoint sibling branches in ReplyThreadGroup', () => {
    const parentReply: Publication = { ...dummyPost('reply-1'), id: 'reply-1' };
    const branch1: Publication = { ...dummyPost('b1'), id: 'b1', parent_publication_id: 'reply-1' };
    const branch2Sibling: Publication = { ...dummyPost('b2'), id: 'b2', parent_publication_id: 'reply-1' }; // replies to reply-1, NOT b1

    const replyWithSubthreads: Publication = {
      ...parentReply,
      subthread_preview: [branch1, branch2Sibling],
      subthread_remaining_count: 0,
    };

    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ReplyThreadGroup reply={replyWithSubthreads} rootAuthorId="u-root" rootAuthorUsername="root_user" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const subItems = container.querySelectorAll('section div.cursor-pointer');
    expect(subItems.length).toBe(2);

    // First sub-item (b1) should connect top to reply-1, but NOT bottom to b2
    const firstAvatarCol = subItems[0].querySelector('.w-12') as HTMLElement;
    expect(firstAvatarCol.querySelector('.-mt-2')).toBeInTheDocument(); // connectTop: true
    expect(firstAvatarCol.querySelector('.-mb-2\\.5')).toBeNull(); // connectBottom: false! (b2 is not a child of b1)

    // Second sub-item (b2) should NOT connect top to b1
    const secondAvatarCol = subItems[1].querySelector('.w-12') as HTMLElement;
    expect(secondAvatarCol.querySelector('.-mt-2')).toBeNull(); // connectTop: false! (b2 did not reply to b1)
  });
});
