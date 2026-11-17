import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImageMemoryCache } from '../src/utils/imageCache.js';
import { PixelAvatar } from '../src/components/common/PixelAvatar.js';
import { MediaGrid } from '../src/components/publication/MediaGrid.js';
import { MobileBottomNav } from '../src/components/layout/MobileBottomNav.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { RoutePrefetchService } from '../src/services/RoutePrefetchService.js';

describe('ImageMemoryCache and Mobile Performance', () => {
  beforeEach(() => {
    ImageMemoryCache.clear();
    vi.clearAllMocks();
  });

  it('correctly tracks and marks cached images', () => {
    expect(ImageMemoryCache.has('https://img.example.com/a.png')).toBe(false);
    ImageMemoryCache.mark('https://img.example.com/a.png');
    expect(ImageMemoryCache.has('https://img.example.com/a.png')).toBe(true);
    ImageMemoryCache.clear();
    expect(ImageMemoryCache.has('https://img.example.com/a.png')).toBe(false);
  });

  it('renders PixelAvatar eager and sync when in memory cache', () => {
    const testUrl = 'https://img.example.com/avatar.png';
    ImageMemoryCache.mark(testUrl);
    render(<PixelAvatar src={testUrl} username="test" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('decoding')).toBe('sync');
  });

  it('marks avatar in cache when onLoad fires', () => {
    const testUrl = 'https://img.example.com/fresh.png';
    render(<PixelAvatar src={testUrl} username="fresh" />);
    const img = screen.getByRole('img');
    expect(ImageMemoryCache.has(testUrl)).toBe(false);
    fireEvent.load(img);
    expect(ImageMemoryCache.has(testUrl)).toBe(true);
  });

  it('MediaGrid uses eager and sync for cached media items', () => {
    const mediaUrl = 'https://img.example.com/photo.jpg';
    ImageMemoryCache.mark(mediaUrl);
    render(<MediaGrid images={[{ url: mediaUrl, type: 'image' }]} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('decoding')).toBe('sync');
  });

  it('MobileBottomNav includes touch-manipulation and triggers prefetch on pointerdown', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'tester', name: 'Tester', role: 'user' } as any,
    });
    const prefetchSpy = vi.spyOn(RoutePrefetchService, 'prefetchRouteData').mockImplementation(() => {});
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MobileBottomNav />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const nav = screen.getByRole('navigation', { name: /navegación móvil/i });
    expect(nav.className).toContain('touch-manipulation');

    const homeLink = screen.getByRole('link', { name: /inicio/i });
    fireEvent.pointerDown(homeLink);
    expect(prefetchSpy).toHaveBeenCalledWith(client, '/');
  });
});
