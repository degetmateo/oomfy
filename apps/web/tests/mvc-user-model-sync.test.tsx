import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ProfileInfo } from '../src/components/profile/ProfileInfo.js';
import { UserSearchCard } from '../src/components/profile/UserSearchCard.js';
import { PublicationCard } from '../src/components/publication/PublicationCard.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Frontend MVC User Model Multi-View Consistency', () => {
  const user: PublicUser = {
    id: 'u-mvc-test', username: 'daniela', name: 'Daniela Test', role: 'member',
    created_at: new Date().toISOString(), follower_count: 10, followed_count: 5, publication_count: 3,
    icon_url: null, banner_url: null, bio: 'Bio original', location: 'Madrid', link: null,
    is_following: false, follows_you: false,
  };

  const postByUser: Publication = {
    id: 'p-user-sync-1',
    author: { id: 'u-mvc-test', username: 'daniela', name: 'Daniela Test', role: 'member', icon_url: null, banner_url: null },
    type: 'default', content: 'Publicacion de Daniela', created_at: new Date().toISOString(),
    parent_publication_id: null, root_publication_id: null,
    upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    userIdentityMap.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'valid-test-tok',
      user: { id: 'u-other', username: 'other', name: 'Other', role: 'member' } as any,
    });
  });

  it('updates ProfileInfo, UserSearchCard, and PublicationCard author simultaneously on user model patch', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProfileInfo user={user} isOwnProfile={false} />
          <UserSearchCard user={user} />
          <PublicationCard post={postByUser} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getAllByText('Daniela Test')).toHaveLength(3);
    userIdentityMap.patch(user.username, (prev) => ({
      ...prev, name: 'Daniela Actualizada', bio: 'Bio actualizada en tiempo real',
    }));

    await waitFor(() => {
      expect(screen.getAllByText('Daniela Actualizada')).toHaveLength(3);
      expect(screen.getAllByText('Bio actualizada en tiempo real')).toHaveLength(2);
      expect(screen.queryByText('Daniela Test')).not.toBeInTheDocument();
    });
  });

  it('preserves full profile fields when partial author summary is ingested and tracks staleness TTL', () => {
    const t0 = 1_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    userIdentityMap.ingest([user], t0, true);
    expect(userIdentityMap.isStale('daniela', 60_000, true)).toBe(false);

    userIdentityMap.ingest([{ id: 'u-mvc-test', username: 'daniela', name: 'Daniela New', role: 'member', icon_url: null, banner_url: null } as any], t0 + 1000, false);
    const merged = userIdentityMap.get('daniela');
    expect(merged?.name).toBe('Daniela New');
    expect(merged?.bio).toBe('Bio original');
    expect(merged?.follower_count).toBe(10);

    vi.spyOn(Date, 'now').mockReturnValue(t0 + 65_000);
    expect(userIdentityMap.isStale('daniela', 60_000, true)).toBe(true);
  });
});
