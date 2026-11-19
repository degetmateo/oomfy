import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountSettingsTab } from '../src/components/settings/AccountSettingsTab.js';
import { Aside } from '../src/components/layout/Aside.js';
import { ApiClient } from '../src/services/api.js';
import { SocketClient } from '../src/services/socket.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Online Members Banner & Settings Toggle', () => {
  const socketHandlers = new Map<string, (...args: any[]) => void>();

  beforeEach(() => {
    vi.restoreAllMocks();
    socketHandlers.clear();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue({
      on: vi.fn((ev: string, cb: any) => socketHandlers.set(ev, cb)),
      off: vi.fn((ev: string) => socketHandlers.delete(ev)),
    } as any);
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', show_online_status: true } as any,
    });
  });

  it('allows toggling show_online_status in AccountSettingsTab', async () => {
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true, data: { show_online_status: false } } as any);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><AccountSettingsTab /></QueryClientProvider>
      </MemoryRouter>
    );

    const toggle = screen.getByRole('switch', { name: /Miembros en línea/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/settings/online-status', { show_online_status: false }));
    expect(useAuthStore.getState().user?.show_online_status).toBe(false);
  });

  it('displays at most 6 online members in Aside and updates on socket online-members-updated', async () => {
    const eightOnline = Array.from({ length: 8 }, (_, i) => ({
      id: `on-${i + 1}`, username: `onuser${i + 1}`, name: `On ${i + 1}`, role: 'member',
    }));
    const getSpy = vi.spyOn(ApiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/aux/online-members')) return { success: true, data: eightOnline } as any;
      return { success: true, data: [{ id: 'u2', username: 'bob', name: 'Bob', role: 'member' }] } as any;
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><Aside /></QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Miembros en línea')).toBeInTheDocument());
    expect(screen.getByText('@onuser6')).toBeInTheDocument();
    expect(screen.queryByText('@onuser7')).not.toBeInTheDocument();

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    socketHandlers.get('online-members-updated')?.();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['online-members'] });
    expect(getSpy).toHaveBeenCalledWith('/aux/online-members?limit=6');
  });

  it('hides online banner when user disabled show_online_status', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', show_online_status: false } as any,
    });
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><Aside /></QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/aux/suggested-members?limit=4'));
    expect(screen.queryByText('Miembros en línea')).not.toBeInTheDocument();
    expect(getSpy).not.toHaveBeenCalledWith('/aux/online-members?limit=6');
  });
});
