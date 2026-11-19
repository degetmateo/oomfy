import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication, Notification } from '@oomfy/shared';
import { HomeView } from '../src/views/HomeView.js';
import { ThreadAncestorCard } from '../src/components/publication/ThreadAncestorCard.js';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';
import { HOME_TIMELINE_STORAGE_KEY } from '../src/components/publication/HomeTimelineTabs.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';

describe('Home Timelines, Ancestor Interactions & Direct Publication Notifications', () => {
  let client: QueryClient;
  const aliceAuthor = { id: 'u1', username: 'alice', name: 'Alice', role: 'member' as const, icon_url: null, banner_url: null };
  const bobAuthor = { id: 'u2', username: 'bob', name: 'Bob', role: 'member' as const, icon_url: null, banner_url: null };
  const quotedOrigin: Publication = {
    id: 'orig-1', author: aliceAuthor, type: 'default', content: 'Publicación original citada',
    created_at: new Date().toISOString(), parent_publication_id: null, root_publication_id: null,
    images: [], embeds: [], upvotes_count: 1, shares_count: 0, quotes_count: 1, comments_count: 0,
  };
  const replyPub: Publication = {
    id: 'pub-embed-1', author: bobAuthor, type: 'reply', content: 'Esta respuesta sí tiene contenido y botones',
    created_at: new Date().toISOString(), parent_publication_id: 'root-1', root_publication_id: 'root-1',
    images: [], embeds: [], upvotes_count: 3, shares_count: 1, quotes_count: 0, comments_count: 2,
    is_upvoted: false, is_shared: false, is_quoted: false, target_publication: quotedOrigin,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({ isAuthenticated: true, user: aliceAuthor as any });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('HomeView renders Global, Siguiendo, Para ti tabs and persists selected tab across reloads', async () => {
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const { unmount } = render(<MemoryRouter><QueryClientProvider client={client}><HomeView /></QueryClientProvider></MemoryRouter>);

    expect(screen.getByRole('tab', { name: /Global/i })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/publications?limit=20'));

    fireEvent.click(screen.getByRole('tab', { name: /Siguiendo/i }));
    expect(window.localStorage.getItem(HOME_TIMELINE_STORAGE_KEY)).toBe('following');
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/publications?feed=following&limit=20'));

    fireEvent.click(screen.getByRole('tab', { name: /Para ti/i }));
    expect(window.localStorage.getItem(HOME_TIMELINE_STORAGE_KEY)).toBe('foryou');
    expect(screen.getByText(/Para ti — En desarrollo/i)).toBeInTheDocument();

    unmount();
    render(<MemoryRouter><QueryClientProvider client={client}><HomeView /></QueryClientProvider></MemoryRouter>);
    expect(screen.getByRole('tab', { name: /Para ti/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('ThreadAncestorCard renders interactive PublicationActions buttons', () => {
    render(<MemoryRouter><QueryClientProvider client={client}><ThreadAncestorCard post={replyPub} /></QueryClientProvider></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Comentar \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Citar \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Me gusta \(3\)/i })).toBeInTheDocument();
  });

  it('NotificationItem renders reply and quote notifications directly as normal PublicationCard items without wrapper text', () => {
    const replyNotif: Notification = {
      id: 'n1', recipient_id: 'u1', sender: bobAuthor, type: 'comment',
      target_publication_id: replyPub.id, target_publication: replyPub,
      status: 'pending', created_at: new Date().toISOString(),
    };
    const { container, rerender } = render(
      <MemoryRouter><QueryClientProvider client={client}><NotificationItem notif={replyNotif} isUnread={true} /></QueryClientProvider></MemoryRouter>
    );
    expect(container.querySelector('.w-0\\.5.flex-1')).toBeNull();
    expect(screen.queryByText(/te respondió:/i)).not.toBeInTheDocument();
    expect(screen.getByText('En respuesta a')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Esta respuesta sí tiene contenido y botones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Me gusta \(3\)/i })).toBeInTheDocument();

    const quotePub: Publication = { ...replyPub, id: 'pub-quote-1', type: 'quote', content: 'Cito esto', target_publication: quotedOrigin };
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <NotificationItem notif={{ ...replyNotif, id: 'n2', type: 'quote', target_publication_id: quotePub.id, target_publication: quotePub }} isUnread={false} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText(/te citó:/i)).not.toBeInTheDocument();
    expect(screen.getByText('Cito esto')).toBeInTheDocument();
    expect(screen.getByText('Publicación original citada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir \(1\)/i })).toBeInTheDocument();
  });
});
