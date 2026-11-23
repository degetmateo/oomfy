import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Notification, Publication, PublicationEmbed } from '@oomfy/shared';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';
import { ChatMessageItem } from '../src/components/chat/ChatMessageItem.js';
import { FormattedText } from '../src/components/common/FormattedText.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { LinkPreviewCard } from '../src/components/publication/LinkPreviewCard.js';
import { useSwipeReply } from '../src/hooks/useSwipeReply.js';
import { useEmoteStore } from '../src/stores/emoteStore.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Notification Excerpts (Like/Share), Chat Link Embeds & Jumbo Emotes', () => {
  const alice = { id: 'u1', username: 'alice', name: 'Alice', role: 'member' as const, icon_url: null, banner_url: null };
  const bob = { id: 'u2', username: 'bob', name: 'Bob', role: 'member' as const, icon_url: null, banner_url: null };
  let qc: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    publicationIdentityMap.clear();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({ isAuthenticated: true, user: bob as any });
    useEmoteStore.setState({
      emotes: [
        {
          id: 'em-1',
          name: 'pepe_ok',
          image_url: 'https://cdn.example.com/pepe.png',
          creator_id: 'u1',
          creator_username: 'alice',
          created_at: new Date().toISOString(),
        },
      ],
      emoteMap: {
        pepe_ok: {
          id: 'em-1',
          name: 'pepe_ok',
          image_url: 'https://cdn.example.com/pepe.png',
          creator_id: 'u1',
          creator_username: 'alice',
          created_at: new Date().toISOString(),
        },
      },
      userEmoteMap: {
        u1: {
          pepe_ok: {
            id: 'em-1',
            name: 'pepe_ok',
            image_url: 'https://cdn.example.com/pepe.png',
            creator_id: 'u1',
            creator_username: 'alice',
            created_at: new Date().toISOString(),
          },
        },
      },
      isLoaded: true,
      isLoading: false,
    });
  });

  const renderApp = (ui: React.ReactNode) =>
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );

  // --- Feature 1: Like & Share Notification Excerpts ---
  it('renders Twitter/X-style text excerpt and inline non-interactive emotes for upvote notifications', () => {
    const targetPub: Publication = {
      id: 'pub-text-1',
      author: alice,
      type: 'default',
      content: 'Qué gran día en oomfy :pepe_ok: con amigos',
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      images: [],
      embeds: [],
      upvotes_count: 3,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
    };

    const notif: Notification = {
      id: 'n-upvote-1',
      recipient_id: 'u1',
      sender: bob,
      type: 'upvote',
      target_publication_id: 'pub-text-1',
      target_publication: targetPub,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { container } = renderApp(<NotificationItem notif={notif} isUnread />);
    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();
    expect(screen.getByText(/indicó que le gusta tu publicación\./i)).toBeInTheDocument();
    expect(screen.getByText(/Qué gran día en oomfy/i)).toBeInTheDocument();

    const emoteImg = screen.getByRole('img', { name: ':pepe_ok:' });
    expect(emoteImg).toHaveAttribute('src', 'https://cdn.example.com/pepe.png');
    expect(emoteImg.closest('button')).toBeNull();

    const actionLink = screen.getByRole('link', { name: /indicó que le gusta tu publicación\./i });
    expect(actionLink).toHaveAttribute('href', '/publication/pub-text-1');

    fireEvent.click(article!);
    expect(mockNavigate).toHaveBeenCalledWith('/publication/pub-text-1');
    expect(publicationIdentityMap.get('pub-text-1')?.id).toBe('pub-text-1');
  });

  it('renders image URL(s) for image-only posts and fallback message for deleted posts in like/share notifications', () => {
    const imgPub: Publication = {
      id: 'pub-img-1',
      author: alice,
      type: 'default',
      content: null,
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      images: [
        { url: 'https://i.ibb.co/pic1.png', source: 'imgbb', index: 0 },
        { url: 'https://i.ibb.co/pic2.png', source: 'imgbb', index: 1 },
      ],
      embeds: [],
      upvotes_count: 1,
      shares_count: 2,
      quotes_count: 0,
      comments_count: 0,
    };

    const shareNotif: Notification = {
      id: 'n-share-1',
      recipient_id: 'u1',
      sender: bob,
      type: 'share',
      target_publication_id: 'pub-img-1',
      target_publication: imgPub,
      status: 'seen',
      created_at: new Date().toISOString(),
    };

    const { rerender } = renderApp(<NotificationItem notif={shareNotif} isUnread={false} />);
    expect(screen.getByText(/compartió tu publicación\./i)).toBeInTheDocument();
    expect(screen.getByText('https://i.ibb.co/pic1.png')).toBeInTheDocument();
    expect(screen.getByText('https://i.ibb.co/pic2.png')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <NotificationItem
            notif={{ ...shareNotif, id: 'n-missing', target_publication_id: 'pub-gone', target_publication: null }}
            isUnread={false}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Publicación no disponible.')).toBeInTheDocument();
  });

  // --- Feature 2: Link Embeds in Chat Messages ---
  it('renders YouTube facade, Spotify embed, multi-link EmbedCarousel, and quoted_publication inside ChatMessageItem', () => {
    const ytEmbed: PublicationEmbed = {
      type: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'Chat YT Video',
      author_name: 'Channel',
      video_id: 'dQw4w9WgXcQ',
      iframe_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    };

    const spEmbed: PublicationEmbed = {
      type: 'spotify',
      url: 'https://open.spotify.com/track/xyz',
      title: 'Chat Track',
      media_kind: 'Pista',
      author_name: 'Artist',
      iframe_url: 'https://open.spotify.com/embed/track/xyz',
      thumbnail_url: 'https://i.scdn.co/art.jpg',
    };

    const quotedPub: Publication = {
      id: 'q-chat-1',
      author: alice,
      type: 'default',
      content: 'Post citado dentro de un chat',
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      images: [],
      embeds: [],
      upvotes_count: 1,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
    };

    const { rerender } = renderApp(
      <ChatMessageItem
        message={{
          id: 'm1',
          chat_id: 'c1',
          sender_id: 'u1',
          sender: alice,
          content: 'Miren este video https://youtu.be/dQw4w9WgXcQ',
          embeds: [ytEmbed],
          quoted_publication: quotedPub,
          created_at: new Date().toISOString(),
        }}
      />
    );

    expect(screen.getByText('Post citado dentro de un chat')).toBeInTheDocument();
    expect(screen.getByText('Chat YT Video')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reproducir Chat YT Video/i }));
    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ChatMessageItem
            message={{
              id: 'm2',
              chat_id: 'c1',
              sender_id: 'u1',
              sender: alice,
              content: 'Varios links',
              embeds: [spEmbed, { type: 'link', url: 'https://example.com', title: 'Example Site' }],
              created_at: new Date().toISOString(),
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('region', { name: 'Enlaces embebidos' })).toBeInTheDocument();
    expect(screen.getByText('Spotify • Pista')).toBeInTheDocument();
    expect(screen.getByText('Example Site')).toBeInTheDocument();
  });

  it('prevents useSwipeReply from triggering when touch starts inside [data-no-swipe="true"]', () => {
    const onReply = vi.fn();
    const { result } = renderHook(() => useSwipeReply(onReply));

    const noSwipeEl = document.createElement('div');
    noSwipeEl.setAttribute('data-no-swipe', 'true');
    const childBtn = document.createElement('button');
    noSwipeEl.appendChild(childBtn);
    document.body.appendChild(noSwipeEl);

    act(() => {
      result.current.onTouchStart({ target: childBtn, touches: [{ clientX: 200, clientY: 100 }] } as any);
      result.current.onTouchMove({ touches: [{ clientX: 100, clientY: 100 }] } as any);
      result.current.onTouchEnd();
    });
    expect(onReply).not.toHaveBeenCalled();

    const normalEl = document.createElement('div');
    document.body.appendChild(normalEl);
    act(() => {
      result.current.onTouchStart({ target: normalEl, touches: [{ clientX: 200, clientY: 100 }] } as any);
      result.current.onTouchMove({ touches: [{ clientX: 120, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.onTouchEnd();
    });
    expect(onReply).toHaveBeenCalledTimes(1);

    noSwipeEl.remove();
    normalEl.remove();
  });

  // --- Feature 3: Discord-Style Jumbo Emotes ---
  it('enlarges single and multiple emote-only publications & chat messages while ignoring mixed/plain text/invalid tokens', () => {
    const basePost: Publication = {
      id: 'p-emote-1',
      author: alice,
      type: 'default',
      content: ':pepe_ok:',
      created_at: new Date().toISOString(),
      parent_publication_id: null,
      root_publication_id: null,
      images: [],
      embeds: [],
      upvotes_count: 0,
      shares_count: 0,
      quotes_count: 0,
      comments_count: 0,
    };

    const { container, rerender } = renderApp(<PublicationCard post={basePost} />);
    expect(container.querySelector('[data-emote-only="single"]')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: ':pepe_ok:' }).className).toContain('w-14 h-14 sm:w-16 sm:h-16');

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ChatMessageItem
            message={{
              id: 'm-em-2',
              chat_id: 'c1',
              sender_id: 'u1',
              sender: alice,
              content: ':pepe_ok: 🔥',
              created_at: new Date().toISOString(),
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container.querySelector('[data-emote-only="multiple"]')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: ':pepe_ok:' }).className).toContain('w-12 h-12');
    expect(screen.getByText('🔥').className).toContain('text-[2.5rem]');

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <FormattedText text="🔥" enlargeEmoteOnly />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container.querySelector('[data-emote-only="single"]')).toBeInTheDocument();
    expect(screen.getByText('🔥').className).toContain('text-[3.25rem] sm:text-[3.75rem]');

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <FormattedText text="😀 ❤️ 🇺🇸" enlargeEmoteOnly />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container.querySelector('[data-emote-only="multiple"]')).toBeInTheDocument();

    // Should NOT enlarge mixed text, unresolved emotes, digits/symbols, >27 emotes, or quoted previews
    for (const nonJumbo of ['Hola :pepe_ok:', ':desconocido:', '123', '© ™ # *', Array(28).fill('🔥').join(' ')]) {
      rerender(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <FormattedText text={nonJumbo} authorId="u1" enlargeEmoteOnly />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(container.querySelector('[data-emote-only]')).toBeNull();
    }

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <LinkPreviewCard targetPublication={basePost} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container.querySelector('[data-emote-only]')).toBeNull();
    expect(screen.getByRole('img', { name: ':pepe_ok:' }).className).toContain('w-6 h-6');
  });
});
