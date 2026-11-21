import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { ProfileMeta } from '../src/components/profile/ProfileMeta.js';
import { ExternalWarningView } from '../src/views/ExternalWarningView.js';
import { EditProfileModal } from '../src/components/profile/EditProfileModal.js';
import { UrlHelper } from '../src/utils/UrlHelper.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';

const baseUser: PublicUser = {
  id: 'u-link-1',
  username: 'alice',
  name: 'Alice',
  role: 'member',
  bio: null,
  location: null,
  link: null,
  icon_url: null,
  banner_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  follower_count: 1,
  followed_count: 2,
  publication_count: 3,
};

describe('Profile Links, Normalization, External Warning & Origin API Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    userIdentityMap.clear();
    useAuthStore.setState({ isAuthenticated: true, user: baseUser as any });
  });

  afterEach(() => {
    delete (globalThis as any).Origin;
  });

  it('routes external bare-domain, www, http, and https profile links through /external warning while routing internal links directly', () => {
    const externalCases = [
      { input: 'ejemplo.com', expectedNormalized: 'https://ejemplo.com' },
      { input: 'www.ejemplo.com/ruta?a=1', expectedNormalized: 'https://www.ejemplo.com/ruta?a=1' },
      { input: 'http://ejemplo.com', expectedNormalized: 'http://ejemplo.com' },
      { input: 'https://ejemplo.com/bio', expectedNormalized: 'https://ejemplo.com/bio' },
    ];

    for (const { input, expectedNormalized } of externalCases) {
      const { unmount } = render(
        <MemoryRouter>
          <ProfileMeta user={{ ...baseUser, link: input }} />
        </MemoryRouter>
      );
      const anchor = screen.getByRole('link', { name: input });
      expect(anchor).toHaveAttribute('href', `/external?url=${encodeURIComponent(expectedNormalized)}`);
      unmount();
    }

    render(
      <MemoryRouter>
        <ProfileMeta user={{ ...baseUser, link: 'oomfy.online/bob?tab=likes' }} />
      </MemoryRouter>
    );
    const internalAnchor = screen.getByRole('link', { name: 'oomfy.online/bob?tab=likes' });
    expect(internalAnchor).toHaveAttribute('href', '/bob?tab=likes');
  });

  it('does not render unsafe javascript: profile links in ProfileMeta', () => {
    render(
      <MemoryRouter>
        <ProfileMeta user={{ ...baseUser, link: 'javascript:alert(1)' }} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('ExternalWarningView normalizes bare-domain query params, opens external links safely, and auto-redirects internal links', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const extView = render(
      <MemoryRouter initialEntries={['/external?url=example.com%2Fdocs']}>
        <Routes>
          <Route path="/external" element={<ExternalWarningView />} />
          <Route path="/bob" element={<div>Perfil Bob</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Destino:\s*example\.com/i)).toBeInTheDocument();
    expect(screen.getByText('https://example.com/docs')).toBeInTheDocument();
    const proceedBtn = screen.getByRole('button', { name: /continuar al enlace/i });
    expect(proceedBtn).toBeEnabled();
    fireEvent.click(proceedBtn);
    expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
    extView.unmount();

    render(
      <MemoryRouter initialEntries={['/external?url=oomfy.online%2Fbob']}>
        <Routes>
          <Route path="/external" element={<ExternalWarningView />} />
          <Route path="/bob" element={<div>Perfil Bob</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Perfil Bob')).toBeInTheDocument());
  });

  it('ExternalWarningView disables proceed button for unsafe schemes', () => {
    render(
      <MemoryRouter initialEntries={['/external?url=javascript:alert(1)']}>
        <Routes>
          <Route path="/external" element={<ExternalWarningView />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /continuar al enlace/i })).toBeDisabled();
  });

  it('EditProfileModal normalizes bare domains on save and alerts without calling API on invalid links', async () => {
    const updatedUser = { ...baseUser, link: 'https://github.com/alice' };
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true, data: updatedUser } as any);
    const alertSpy = vi.spyOn(useDialogStore.getState(), 'alert').mockResolvedValue(undefined as any);
    const onUpdated = vi.fn();
    const onClose = vi.fn();
    userIdentityMap.ingest([baseUser], Date.now(), true);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <EditProfileModal user={baseUser} isOpen={true} onClose={onClose} onUpdated={onUpdated} />
      </QueryClientProvider>
    );

    const linkInput = screen.getByLabelText('Sitio web');
    fireEvent.change(linkInput, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(putSpy).not.toHaveBeenCalled();

    fireEvent.change(linkInput, { target: { value: 'github.com/alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/members/me', expect.any(FormData)));
    const sentForm = putSpy.mock.calls[0][1] as FormData;
    expect(sentForm.get('link')).toBe('https://github.com/alice');
    expect(onUpdated).toHaveBeenCalledWith(updatedUser);
  });

  it('UrlHelper.isInternalUrl supports Origin API isSameSite when available and falls back safely when unavailable', () => {
    class MockOrigin {
      public readonly opaque: boolean;
      public readonly scheme: string;
      public readonly host: string;
      constructor(raw: string, opaque = false) {
        this.opaque = opaque;
        if (opaque) {
          this.scheme = '';
          this.host = '';
        } else {
          const u = new URL(raw);
          this.scheme = u.protocol;
          this.host = u.hostname.toLowerCase();
        }
      }
      static from(candidate: unknown): MockOrigin {
        if (candidate === globalThis) return new MockOrigin(window.location.href);
        if (candidate instanceof URL) return new MockOrigin(candidate.href, candidate.origin === 'null');
        if (typeof candidate === 'string') return new MockOrigin(candidate);
        throw new TypeError('Unsupported Origin input');
      }
      isSameSite(other: MockOrigin): boolean {
        if (this.opaque || other.opaque || this.scheme !== other.scheme) return false;
        const reg = (h: string) => {
          if (h === 'oomfy.online' || h.endsWith('.oomfy.online')) return 'oomfy.online';
          return h;
        };
        return reg(this.host) === reg(other.host);
      }
    }

    (globalThis as any).Origin = MockOrigin;
    expect(UrlHelper.isInternalUrl('https://app.oomfy.online/chats')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://api-oomfy.onrender.com/health')).toBe(false);
    expect(UrlHelper.isInternalUrl('data:text/html,hi')).toBe(false);

    delete (globalThis as any).Origin;
    expect(UrlHelper.isInternalUrl('https://app.oomfy.online/chats')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://oomfy.online.evil.com')).toBe(false);
  });
});
