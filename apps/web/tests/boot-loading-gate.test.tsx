import fs from 'fs';
import path from 'path';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { ApiClient } from '../src/services/api.js';
import { setAccessToken } from '../src/services/sessionTokenMemory.js';

describe('Boot Loading Screen Gate & PWA Cold-Launch Shell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setAccessToken(null);
    window.history.replaceState({}, '', '/');
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: true });
  });

  it('ships instant dark #141414 pre-React boot spinner shell in index.html', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
    expect(html).toContain('background-color:#141414');
    expect(html).toContain('id="oomfy-boot-loader"');
    expect(html).toContain('mobile-web-app-capable');
  });

  it('holds global spinner until both refresh and /members/me user data load, never flashing guest UI', async () => {
    let resolveRefresh!: (v: string | null) => void;
    let resolveMe!: (v: any) => void;
    vi.spyOn(ApiClient, 'refreshAccessToken').mockImplementation(() => new Promise((r) => { resolveRefresh = r; }));
    vi.spyOn(ApiClient, 'get').mockImplementation((url: string) => {
      if (url === '/members/me') return new Promise((r) => { resolveMe = r; });
      return Promise.resolve({ success: true, data: [], count: 0 });
    });

    render(<App />);
    expect(screen.getByRole('status', { name: /Cargando aplicación/i })).toBeInTheDocument();
    expect(screen.queryByText(/No te pierdas lo que pasa en Oomfy/i)).toBeNull();
    expect(screen.queryByText('Iniciar sesión')).toBeNull();

    resolveRefresh('token-1');
    await waitFor(() => expect(resolveMe).toBeTypeOf('function'));
    expect(screen.getByRole('status', { name: /Cargando aplicación/i })).toBeInTheDocument();
    expect(screen.queryByText(/No te pierdas lo que pasa en Oomfy/i)).toBeNull();

    resolveMe({ success: true, data: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', terms_accepted: true } });
    await waitFor(() => expect(screen.getByText('@alice')).toBeInTheDocument());
    expect(screen.queryByRole('status', { name: /Cargando aplicación/i })).toBeNull();
    expect(screen.queryByText(/No te pierdas lo que pasa en Oomfy/i)).toBeNull();
  });

  it('reveals guest interface and login prompts together only after session check resolves as guest', async () => {
    let resolveRefresh!: (v: string | null) => void;
    vi.spyOn(ApiClient, 'refreshAccessToken').mockImplementation(() => new Promise((r) => { resolveRefresh = r; }));
    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] });

    render(<App />);
    expect(screen.getByRole('status', { name: /Cargando aplicación/i })).toBeInTheDocument();
    expect(screen.queryByText(/No te pierdas lo que pasa en Oomfy/i)).toBeNull();

    resolveRefresh(null);
    await waitFor(() => expect(screen.getByText(/No te pierdas lo que pasa en Oomfy/i)).toBeInTheDocument());
    expect(screen.queryByRole('status', { name: /Cargando aplicación/i })).toBeNull();
    expect(screen.getAllByText('Iniciar sesión').length).toBeGreaterThan(0);
  });
});

