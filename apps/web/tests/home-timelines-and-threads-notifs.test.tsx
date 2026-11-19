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

describe('Home Timelines, Ancestor Interactions & Twitter-Style Notifications', () => {
  let client: QueryClient;
  const samplePub: Publication = {
    id: 'pub-embed-1',
    author: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
    type: 'reply',
    content: 'Esta respuesta sí tiene contenido y botones',
    created_at: new Date().toISOString(),
    parent_publication_id: 'root-1',
    root_publication_id: 'root-1',
    images: [], embeds: [],
    upvotes_count: 3, shares_count: 1, quotes_count: 0, comments_count: 2,
    is_upvoted: false, is_shared: false, is_quoted: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member' } as any });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('HomeView renders Global, Siguiendo, Para ti tabs and persists selected tab across reloads', async () => {
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const { unmount } = render(
      <MemoryRouter><QueryClientProvider client={client}><HomeView /></QueryClientProvider></MemoryRouter>
    );

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
    render(<MemoryRouter><QueryClientProvider client={client}><ThreadAncestorCard post={samplePub} /></QueryClientProvider></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Comentar \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Citar \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Me gusta \(3\)/i })).toBeInTheDocument();
  });

  it('NotificationItem renders embedded interactive publication for reply and quote', () => {
    const replyNotif: Notification = {
      id: 'n1', recipient_id: 'u1', sender: samplePub.author, type: 'comment',
      target_publication_id: samplePub.id, target_publication: samplePub,
      status: 'pending', created_at: new Date().toISOString(),
    };
    const { rerender } = render(
      <MemoryRouter><QueryClientProvider client={client}><NotificationItem notif={replyNotif} isUnread={true} /></QueryClientProvider></MemoryRouter>
    );
    expect(screen.getByText(/te respondió:/i)).toBeInTheDocument();
    expect(screen.getByText('Esta respuesta sí tiene contenido y botones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Me gusta \(3\)/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={client}><NotificationItem notif={{ ...replyNotif, id: 'n2', type: 'quote' }} isUnread={false} /></QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/te citó:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir \(1\)/i })).toBeInTheDocument();
  });
});
