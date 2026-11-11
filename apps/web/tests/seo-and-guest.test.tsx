import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SeoHead } from '../src/components/common/SeoHead.js';
import { GuestBottomBanner } from '../src/components/layout/GuestBottomBanner.js';
import { FormattedText } from '../src/components/common/FormattedText.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('SEO Head, Guest Banner & UGC Links', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('injects dynamic title, canonical link, robots, OpenGraph, and JSON-LD script into document.head', () => {
    render(
      <SeoHead
        title="Alice (@alice) — Perfil y Publicaciones | Oomfy"
        description="Bio de Alice en Oomfy"
        canonicalPath="/alice"
        ogImage="https://oomfy.online/og/user/alice"
        ogType="profile"
        noIndex={false}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'ProfilePage', name: 'Alice' }}
      />
    );

    expect(document.title).toBe('Alice (@alice) — Perfil y Publicaciones | Oomfy');
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://oomfy.online/alice');

    const ogImg = document.head.querySelector('meta[property="og:image"]');
    expect(ogImg?.getAttribute('content')).toBe('https://oomfy.online/og/user/alice');

    const jsonLd = document.getElementById('oomfy-jsonld');
    expect(jsonLd?.textContent).toContain('"@type":"ProfilePage"');
  });

  it('renders GuestBottomBanner for unauthenticated visitors and hides it when authenticated', () => {
    const { rerender } = render(
      <MemoryRouter>
        <GuestBottomBanner />
      </MemoryRouter>
    );
    expect(screen.getByText(/¡No te pierdas lo que pasa en Oomfy!/i)).toBeTruthy();

    act(() => {
      useAuthStore.setState({ isAuthenticated: true });
    });
    rerender(
      <MemoryRouter>
        <GuestBottomBanner />
      </MemoryRouter>
    );
    expect(screen.queryByText(/¡No te pierdas lo que pasa en Oomfy!/i)).toBeNull();
  });

  it('renders external links with rel="ugc nofollow noopener noreferrer" and hashtags pointing to /t/:tag', () => {
    render(
      <MemoryRouter>
        <FormattedText text="Mira https://example.com/proyecto en #Arte-Digital con @alice" />
      </MemoryRouter>
    );

    const extLink = screen.getByText('https://example.com/proyecto').closest('a');
    expect(extLink?.getAttribute('rel')).toBe('ugc nofollow noopener noreferrer');
    expect(extLink?.getAttribute('target')).toBe('_blank');

    const tagLink = screen.getByText('#Arte-Digital').closest('a');
    expect(tagLink?.getAttribute('href')).toBe('/t/arte-digital');
  });
});
