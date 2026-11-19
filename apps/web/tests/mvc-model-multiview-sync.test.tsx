import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { PublicationDetailArticle } from '../src/components/publication/PublicationDetailArticle.js';
import { SharedPublicationCard } from '../src/components/publication/SharedPublicationCard.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { chatIdentityMap } from '../src/models/ChatIdentityMap.js';
import { useChatMessages } from '../src/hooks/useChatMessages.js';
import { ApiClient } from '../src/services/api.js';
import { SocketClient } from '../src/services/socket.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Frontend MVC Model & Multi-View Consistency', () => {
  const post: Publication = {
    id: 'post-mvc-test-100',
    author: { id: 'u-author', username: 'author1', name: 'Author One', role: 'member', icon_url: null, banner_url: null },
    type: 'default', content: 'MVC canonical model test content', created_at: new Date().toISOString(),
    parent_publication_id: null, root_publication_id: null,
    upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0, is_upvoted: false, is_shared: false,
  };

  const sharedWrapper: Publication = {
    id: 'shared-wrapper-200',
    author: { id: 'u-sharer', username: 'sharer', name: 'Sharer User', role: 'member', icon_url: null, banner_url: null },
    type: 'shared', content: null, created_at: new Date().toISOString(),
    parent_publication_id: post.id, root_publication_id: null,
    upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0, target_publication: post,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    chatIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-test-tok',
      user: { id: 'u-sharer', username: 'sharer', name: 'Sharer User', role: 'member' } as any,
    });
  });

  it('updates share count from 0 to 1 across TL, Profile, Detail, and Shared cards on share', async () => {
    const qc = new QueryClient();
    vi.spyOn(ApiClient, 'post').mockResolvedValueOnce({ success: true, shared: true, shares_count: 1 });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <div data-testid="tl-view"><PublicationCard post={post} /></div>
          <div data-testid="profile-view"><PublicationCard post={post} /></div>
          <div data-testid="detail-view">
            <PublicationDetailArticle publication={post} repliesCount={0} canDelete={false} isAuthenticated={true}
              articleRef={React.createRef()} onDelete={vi.fn()} onQuote={vi.fn()} />
          </div>
          <div data-testid="shared-card"><SharedPublicationCard post={sharedWrapper} canDelete={false} onDelete={vi.fn()} /></div>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const shareButtons = screen.getAllByTitle('Compartir');
    expect(shareButtons.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(shareButtons[0]);

    await waitFor(() => {
      for (const btn of shareButtons) { expect(btn).toHaveAttribute('aria-pressed', 'true'); expect(btn).toHaveTextContent('1'); }
    });

    publicationIdentityMap.patch(post.id, (prev) => ({ ...prev, shares_count: 42 }));
    await waitFor(() => {
      for (const btn of shareButtons) expect(btn).toHaveTextContent('42');
    });
  });

  it('serves cached ChatIdentityMap messages immediately without redundant refetch inside TTL window', async () => {
    const now = 2_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    chatIdentityMap.ingestMessages('chat-ttl-1', [
      { id: 'msg-1', chat_id: 'chat-ttl-1', sender_id: 'u-other', content: 'Cached message', created_at: new Date(now).toISOString() },
    ], 'replace', now, true);

    vi.spyOn(SocketClient, 'getSocket').mockReturnValue({ on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any);
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient();
    const wrapper = ({ children }: any) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useChatMessages('chat-ttl-1', 'u-sharer', vi.fn()), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Cached message');
    expect(getSpy).not.toHaveBeenCalled();

    vi.spyOn(Date, 'now').mockReturnValue(now + 65_000);
    expect(chatIdentityMap.isMessagesStale('chat-ttl-1', 60_000)).toBe(true);
  });
});
