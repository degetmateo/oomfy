import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileInfo } from '../src/components/profile/ProfileInfo.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';
import { PublicUser } from '@oomfy/shared';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<any>('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const mockUser: PublicUser = {
  id: '019e-target-user', username: 'carlos', name: 'Carlos Perez', role: 'member', status: 'active',
  created_at: new Date().toISOString(), followers_count: 5, following_count: 3, publications_count: 10,
  icon_url: null, banner_url: null, bio: 'Bio', is_following: false, follows_you: false,
};

describe('Profile Direct Message Navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-test-token',
      user: { id: '019e-me', username: 'me', name: 'My Name', role: 'member', email: 'me@oomfy.online', created_at: '' },
    });
  });

  const renderProfile = () => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><ProfileInfo user={mockUser} isOwnProfile={false} /></MemoryRouter>
    </QueryClientProvider>
  );

  it('calls /chats/start and navigates to /chats?id= when data.id is returned for existing chat', async () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValueOnce({
      success: true, data: { id: 'chat-uuid-existing-999', isNew: false },
    } as any);

    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/chats/start', { target_username: 'carlos' });
      expect(mockNavigate).toHaveBeenCalledWith('/chats?id=chat-uuid-existing-999');
    });
  });

  it('navigates correctly when backend provides top-level chatId field', async () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValueOnce({
      success: true, data: { id: 'chat-uuid-new-123', isNew: true }, chatId: 'chat-uuid-new-123',
    } as any);

    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/chats/start', { target_username: 'carlos' });
      expect(mockNavigate).toHaveBeenCalledWith('/chats?id=chat-uuid-new-123');
    });
  });

  it('shows error alert and releases loading state if starting chat fails', async () => {
    vi.spyOn(ApiClient, 'post').mockRejectedValueOnce(new Error('Usuario bloqueado'));
    const alertSpy = vi.spyOn(useDialogStore.getState(), 'alert');

    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Usuario bloqueado', 'Error');
    });
  });
});
