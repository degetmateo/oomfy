import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsView } from '../src/views/SettingsView.js';
import { PublicationCreator } from '../src/components/publication/PublicationCreator.js';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useEmoteStore } from '../src/stores/emoteStore.js';
import { ApiClient } from '../src/services/api.js';

describe('Customization Tab, Composer Autocomplete & Mention Notifications', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sampleEmote = {
    id: 'em-cool', name: 'pepe_cool', image_url: 'https://cdn.example/cool.png',
    creator_id: 'u1', creator_username: 'mateo_dev', created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'tester', name: 'Tester', role: 'member' } as any,
    });
    useEmoteStore.setState({ emotes: [sampleEmote], emoteMap: { pepe_cool: sampleEmote }, isLoaded: true, isLoading: false });
    vi.spyOn(ApiClient, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/aux/emotes')) return { success: true, data: [sampleEmote] } as any;
      if (endpoint.startsWith('/aux/search-users')) {
        return { success: true, data: [{ id: 'u2', username: 'mateo_dev', name: 'Mateo Dev', role: 'member', icon_url: null }] } as any;
      }
      return { success: true, data: [] } as any;
    });
  });

  it('renders Personalización tab in SettingsView with emote quota and displays custom emotes', async () => {
    render(<MemoryRouter initialEntries={['/settings?tab=customization']}><SettingsView /></MemoryRouter>);
    expect(screen.getByText('Personalización')).toBeInTheDocument();
    expect(screen.getByText('Emotes personalizados')).toBeInTheDocument();
    expect(screen.getByText('Mis emotes: 1/12')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(':pepe_cool:')).toBeInTheDocument());
  });

  it('enforces 1024 char limit for members and unlimited for admins in composer', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(<QueryClientProvider client={qc}><MemoryRouter><PublicationCreator /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByPlaceholderText('¿Qué estás pensando?')).toHaveAttribute('maxLength', '1024');
    expect(screen.getByText('0/1024')).toBeInTheDocument();

    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-adm', username: 'adm', name: 'Admin', role: 'admin' } as any });
    rerender(<QueryClientProvider client={qc}><MemoryRouter><PublicationCreator /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByPlaceholderText('¿Qué estás pensando?')).not.toHaveAttribute('maxLength');
    expect(screen.getByText('0/∞')).toBeInTheDocument();
  });

  it('shows emote autocomplete for :prefix and user mention autocomplete for @prefix', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PublicationCreator /></MemoryRouter>
      </QueryClientProvider>
    );

    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hola :pe' } });

    const emoteOpt = await screen.findByText(':pepe_cool:');
    fireEvent.mouseDown(emoteOpt);
    expect(textarea.value).toBe('Hola :pepe_cool: ');

    fireEvent.change(textarea, { target: { value: 'Hola @ma' } });
    const userOpt = await screen.findByText('@mateo_dev');
    fireEvent.mouseDown(userOpt);
    expect(textarea.value).toBe('Hola @mateo_dev ');
  });

  it('renders mention notifications for publications and messages', () => {
    const baseNotif = {
      id: 'n1', recipient_id: 'u1',
      sender: { id: 'u2', username: 'mateo_dev', name: 'Mateo Dev', role: 'member' as const, icon_url: null, banner_url: null },
      type: 'mention' as const, target_publication_id: 'pub-1', status: 'pending' as const, created_at: new Date().toISOString(),
    };
    const { rerender } = render(<MemoryRouter><NotificationItem notif={baseNotif} isUnread={true} /></MemoryRouter>);
    expect(screen.getByText(/te mencionó en una publicación\./i)).toBeInTheDocument();

    rerender(<MemoryRouter><NotificationItem notif={{ ...baseNotif, target_publication_id: null }} isUnread={false} /></MemoryRouter>);
    expect(screen.getByText(/te mencionó en un mensaje\./i)).toBeInTheDocument();
  });
});
