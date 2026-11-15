import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountSettingsTab } from '../src/components/settings/AccountSettingsTab.js';
import { Aside } from '../src/components/layout/Aside.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Online status visibility setting (Invisible mode)', () => {
  const renderTab = (client = new QueryClient()) =>
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AccountSettingsTab />
        </QueryClientProvider>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', show_online_status: true } as any,
    });
  });

  it('toggles between En línea and Invisible via PUT /settings/online-status', async () => {
    const putSpy = vi.spyOn(ApiClient, 'put')
      .mockResolvedValueOnce({ success: true, data: { show_online_status: false } } as any)
      .mockResolvedValueOnce({ success: true, data: { show_online_status: true } } as any);

    renderTab();
    const checkbox = screen.getByLabelText(/Mostrar mi estado en línea a otros miembros/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('En línea')).toBeInTheDocument();

    fireEvent.click(checkbox);
    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/settings/online-status', { show_online_status: false }));
    expect(useAuthStore.getState().user?.show_online_status).toBe(false);
    expect(screen.getByText('Invisible')).toBeInTheDocument();

    fireEvent.click(checkbox);
    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/settings/online-status', { show_online_status: true }));
    expect(useAuthStore.getState().user?.show_online_status).toBe(true);
    expect(screen.getByText('En línea')).toBeInTheDocument();
  });

  it('hides the current user from Aside online members list immediately when invisible', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', show_online_status: false } as any,
    });
    vi.spyOn(ApiClient, 'get').mockImplementation(async (path: string) => {
      if (path === '/aux/online-members') {
        return { success: true, data: [{ id: 'u1', username: 'alice', name: 'Alice' }, { id: 'u2', username: 'bob', name: 'Bob' }] } as any;
      }
      return { success: true, data: [] } as any;
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><Aside /></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});
