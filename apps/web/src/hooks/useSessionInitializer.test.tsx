import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionInitializer } from './useSessionInitializer.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { useAuthStore } from '../stores/authStore.js';
import { ApiClient } from '../services/api.js';
import { setAccessToken } from '../services/sessionTokenMemory.js';

const BootHarness: React.FC = () => {
  useSessionInitializer();
  return (
    <Routes>
      <Route path="/signin" element={<div>Login Page</div>} />
      <Route path="/settings" element={<ProtectedRoute><div>Protected Settings</div></ProtectedRoute>} />
    </Routes>
  );
};

describe('useSessionInitializer & ProtectedRoute boot flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: true });
  });

  it('waits for session refresh under StrictMode without bouncing to /signin', async () => {
    let resolveRefresh!: (v: string | null) => void;
    const refreshSpy = vi.spyOn(ApiClient, 'refreshAccessToken').mockImplementation(() => new Promise((r) => { resolveRefresh = r; }));
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: { id: 'u1', username: 'alice', name: 'Alice', role: 'member' } });

    render(<React.StrictMode><MemoryRouter initialEntries={['/settings']}><BootHarness /></MemoryRouter></React.StrictMode>);
    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();

    resolveRefresh('fresh-access-token');
    await waitFor(() => expect(screen.getByText('Protected Settings')).toBeInTheDocument());
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('redirects to /signin when refresh fails cleanly', async () => {
    vi.spyOn(ApiClient, 'refreshAccessToken').mockResolvedValue(null);
    render(<MemoryRouter initialEntries={['/settings']}><BootHarness /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('preserves session when /members/me fails with transient 503', async () => {
    vi.spyOn(ApiClient, 'refreshAccessToken').mockResolvedValue('fresh-token');
    vi.spyOn(ApiClient, 'get').mockRejectedValue(Object.assign(new Error('Service unavailable'), { status: 503 }));
    render(<MemoryRouter initialEntries={['/settings']}><BootHarness /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Protected Settings')).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('restores and rotates session via localStorage refreshToken fallback without saving accessToken in localStorage', async () => {
    localStorage.setItem('oomfy_refresh_token', 'rt-1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, accessToken: 'at-2', refreshToken: 'rt-2' }), { status: 200 })
    );

    const token = await ApiClient.refreshAccessToken();
    expect(token).toBe('at-2');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ refreshToken: 'rt-1' }),
    }));
    expect(localStorage.getItem('oomfy_refresh_token')).toBe('rt-2');
    expect(localStorage.getItem('oomfy_token')).toBeNull();
    useAuthStore.getState().logout(false);
    expect(localStorage.getItem('oomfy_refresh_token')).toBeNull();
  });
});

