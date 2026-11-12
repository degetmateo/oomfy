import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { ProfileInfo } from '../src/components/profile/ProfileInfo.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Frontend MVC User Model Multi-View Consistency', () => {
  const user: PublicUser = {
    id: 'u-mvc-test', username: 'daniela', name: 'Daniela Test', role: 'member', status: 'active',
    created_at: new Date().toISOString(), followers_count: 10, following_count: 5, publications_count: 3,
    icon_url: null, banner_url: null, bio: 'Bio original', is_following: false, follows_you: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    userIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'valid-test-tok',
      user: { id: 'u-other', username: 'other', name: 'Other', role: 'member' } as any,
    });
  });

  it('updates all observer components simultaneously when user model is patched', async () => {
    const qc = new QueryClient();

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <div data-testid="profile-header-1"><ProfileInfo user={user} isOwnProfile={false} /></div>
          <div data-testid="profile-header-2"><ProfileInfo user={user} isOwnProfile={false} /></div>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getAllByText('Daniela Test')).toHaveLength(2);
    expect(screen.getAllByText('Bio original')).toHaveLength(2);

    userIdentityMap.patch(user.username, (prev) => ({
      ...prev,
      name: 'Daniela Actualizada',
      bio: 'Bio actualizada en tiempo real',
    }));

    await waitFor(() => {
      expect(screen.getAllByText('Daniela Actualizada')).toHaveLength(2);
      expect(screen.getAllByText('Bio actualizada en tiempo real')).toHaveLength(2);
      expect(screen.queryByText('Daniela Test')).not.toBeInTheDocument();
    });
  });
});

