import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountSettingsTab } from '../src/components/settings/AccountSettingsTab.js';
import { Aside } from '../src/components/layout/Aside.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Online members privacy removal in UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member' } as any,
    });
  });

  it('does not render any online status toggle in AccountSettingsTab', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AccountSettingsTab />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/Estado en línea/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Mostrar mi estado en línea/i)).not.toBeInTheDocument();
  });

  it('does not render Miembros en línea or request /aux/online-members in Aside', async () => {
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({
      success: true,
      data: [{ id: 'u2', username: 'bob', name: 'Bob', role: 'member' }],
    } as any);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <Aside />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    expect(screen.queryByText(/Miembros en línea/i)).not.toBeInTheDocument();
    expect(getSpy).not.toHaveBeenCalledWith('/aux/online-members');
    expect(getSpy).toHaveBeenCalledWith('/aux/suggested-members?limit=4');
  });
});
