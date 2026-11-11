import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync.js';
import { ModerationView } from '../src/views/ModerationView.js';
import { AdminView } from '../src/views/AdminView.js';
import { SocketClient } from '../src/services/socket.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';

function createMockSocket() {
  const listeners = new Map<string, Set<Function>>();
  return {
    on: (ev: string, fn: Function) => { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev)!.add(fn); },
    off: (ev: string, fn: Function) => listeners.get(ev)?.delete(fn),
    emit: vi.fn(),
    trigger: (ev: string, data?: any) => listeners.get(ev)?.forEach((fn) => fn(data)),
  };
}

const SyncHarness: React.FC = () => { useRealtimeSync(); return null; };

describe('Realtime Sync on Resume & Admin/Moderation Refetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'mod-1', username: 'mod', name: 'Mod', role: 'mod' } as any });
  });

  it('increments unread badge on notification socket event and refetches lists on tab visibility', () => {
    const sock = createMockSocket();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue(sock as any);
    const qc = new QueryClient();
    qc.setQueryData(['notifications-unread-count'], { success: true, count: 1 });
    const invSpy = vi.spyOn(qc, 'invalidateQueries');

    render(<QueryClientProvider client={qc}><SyncHarness /></QueryClientProvider>);
    sock.trigger('notification', { id: 'n-99', type: 'upvote' });
    expect((qc.getQueryData(['notifications-unread-count']) as any).count).toBe(2);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(invSpy).toHaveBeenCalledWith({ queryKey: ['notifications-unread-count'] });
    expect(invSpy).toHaveBeenCalledWith({ queryKey: ['unread-messages-count'] });
    expect(invSpy).toHaveBeenCalledWith({ queryKey: ['chats'] });
  });

  it('provides working Refresh button in AdminView and ModerationView and uses /publications/:id for mod post deletion', async () => {
    vi.spyOn(ApiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/staff/reports')) {
        return {
          success: true,
          data: {
            total: 1, page: 1, totalPages: 1,
            reports: [{ id: 'rep-1', target_type: 'publication', target_id: 'pub-99', target_username: 'bad', reason: 'spam', status: 'pending', reporter_username: 'good', created_at: new Date().toISOString() }],
          },
        } as any;
      }
      return { success: true, data: {} } as any;
    });
    const delSpy = vi.spyOn(ApiClient, 'delete').mockResolvedValue({ success: true } as any);
    vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true } as any);
    vi.spyOn(useDialogStore.getState(), 'confirm').mockResolvedValue(true);
    vi.spyOn(useDialogStore.getState(), 'alert').mockImplementation(() => {});

    const qcMod = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetchMod = vi.spyOn(qcMod, 'refetchQueries');
    const modView = render(<MemoryRouter><QueryClientProvider client={qcMod}><ModerationView /></QueryClientProvider></MemoryRouter>);

    await screen.findByText('spam');
    fireEvent.click(modView.getByTitle('Actualizar contenido'));
    expect(refetchMod).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Eliminar post'));
    await waitFor(() => expect(delSpy).toHaveBeenCalledWith('/publications/pub-99'));
    modView.unmount();

    const qcAdmin = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetchAdmin = vi.spyOn(qcAdmin, 'refetchQueries');
    render(<MemoryRouter><QueryClientProvider client={qcAdmin}><AdminView /></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByTitle('Actualizar contenido')).not.toBeDisabled());
    fireEvent.click(screen.getByTitle('Actualizar contenido'));
    expect(refetchAdmin).toHaveBeenCalled();
  });
});

