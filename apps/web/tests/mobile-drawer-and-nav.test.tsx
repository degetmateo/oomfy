import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { PixelNavIcon } from '../src/components/icons/PixelNavIcon.js';
import { MobileBottomNav } from '../src/components/layout/MobileBottomNav.js';
import { Header } from '../src/components/layout/Header.js';
import { MobileSideDrawer } from '../src/components/layout/MobileSideDrawer.js';
import { ChatListSidebar } from '../src/components/chat/ChatListSidebar.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useUIStore } from '../src/stores/uiStore.js';

const makeUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: 'u-me',
  username: 'alice',
  name: 'Alice',
  role: 'member',
  bio: null,
  pronouns: null,
  location: null,
  link: null,
  icon_url: 'https://cdn.example.com/alice.png',
  banner_url: null,
  created_at: new Date().toISOString(),
  follower_count: 42,
  followed_count: 15,
  publication_count: 7,
  ...overrides,
});

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Mobile Navigation Drawer, Enlarged Bottom Nav & Explore Search Icon', () => {
  beforeEach(() => {
    useUIStore.setState({ isMobileDrawerOpen: false });
    useAuthStore.setState({
      user: makeUser(),
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders Search magnifying glass icon for explore instead of Compass', () => {
    const { container } = render(<PixelNavIcon name="explore" size={26} />);
    expect(container.querySelector('[data-nav-icon="explore"].lucide-search')).not.toBeNull();
    expect(container.querySelector('.lucide-compass')).toBeNull();
  });

  it('renders only the 4 main navigation buttons with enlarged 26px icons in MobileBottomNav', () => {
    const { container } = renderWithProviders(<MobileBottomNav />);
    const navLinks = container.querySelectorAll('nav[aria-label="Navegación móvil"] a');
    expect(navLinks).toHaveLength(4);

    expect(screen.getByLabelText('Inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Explorar')).toBeInTheDocument();
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensajes')).toBeInTheDocument();

    expect(screen.queryByLabelText('Perfil')).toBeNull();
    expect(screen.queryByLabelText('Guardados')).toBeNull();
    expect(screen.queryByLabelText('Configuración')).toBeNull();

    const firstIcon = container.querySelector('[data-nav-icon="home"]');
    expect(firstIcon?.getAttribute('width')).toBe('26');
    expect(firstIcon?.getAttribute('height')).toBe('26');
  });

  it('shows avatar drawer trigger instead of back button on main views, and keeps back button on secondary views', () => {
    for (const mainRoute of ['/', '/explore', '/notifications']) {
      const { unmount } = renderWithProviders(<Header title="Vista principal" />, [mainRoute]);
      expect(screen.getByLabelText('Abrir menú de navegación')).toBeInTheDocument();
      expect(screen.queryByLabelText('Volver atrás')).toBeNull();
      unmount();
    }

    for (const secondaryRoute of ['/bookmarks', '/settings', '/publication/42']) {
      const { unmount } = renderWithProviders(<Header title="Vista secundaria" />, [secondaryRoute]);
      expect(screen.getByLabelText('Volver atrás')).toBeInTheDocument();
      expect(screen.queryByLabelText('Abrir menú de navegación')).toBeNull();
      unmount();
    }

    renderWithProviders(<Header title="Forzado" showBack={true} />, ['/']);
    expect(screen.getByLabelText('Volver atrás')).toBeInTheDocument();
    expect(screen.queryByLabelText('Abrir menú de navegación')).toBeNull();
  });

  it('shows avatar drawer trigger and unified header styling in ChatListSidebar on /chats', () => {
    renderWithProviders(
      <ChatListSidebar
        chats={[]}
        isLoading={false}
        selectedChatId={null}
        getOtherParticipant={() => ({})}
        onSelectChat={() => { }}
        onOpenNewChat={() => { }}
      />,
      ['/chats']
    );

    const heading = screen.getByRole('heading', { name: 'Mensajes' });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('text-lg');
    expect(heading.className).toContain('sm:text-xl');
    expect(heading.className).toContain('tracking-tight');
    expect(heading.className).not.toContain('uppercase');
    expect(heading.closest('header')).not.toBeNull();
    expect(screen.getByLabelText('Abrir menú de navegación')).toBeInTheDocument();
  });

  it('keeps MobileSideDrawer open across initial IntersectionObserver frames and closes after swipe-out settles', () => {
    const origOffsetWidthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        if (this.classList?.contains('mobile-drawer-scroller')) return 375;
        if (this.classList?.contains('mobile-drawer-sheet')) return 300;
        return origOffsetWidthDesc?.get ? origOffsetWidthDesc.get.call(this) : 0;
      },
    });
    const origScrollTo = Element.prototype.scrollTo;
    const scrollToSpy = vi.fn();
    Element.prototype.scrollTo = scrollToSpy;

    let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = (entries) => cb(entries, this as unknown as IntersectionObserver);
      }
      observe() { }
      disconnect() { }
      unobserve() { }
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });

    try {
      const { container } = renderWithProviders(
        <>
          <Header title="Inicio" />
          <MobileSideDrawer />
        </>,
        ['/']
      );

      fireEvent.click(screen.getByLabelText('Abrir menú de navegación'));

      const dialog = container.querySelector('#mobile-nav-drawer') as HTMLDialogElement;
      expect(dialog?.hasAttribute('open')).toBe(true);

      // Simulate initial observer tick when sheet starts off-screen before scroll finishes
      act(() => {
        observerCallback?.([{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry]);
      });
      expect(dialog.hasAttribute('open')).toBe(true);
      expect(useUIStore.getState().isMobileDrawerOpen).toBe(true);

      // Flush queued animation frames so scrollTo({ left: 0 }) runs, and simulate sheet still off-screen briefly
      act(() => {
        while (rafQueue.length > 0) {
          const cb = rafQueue.shift()!;
          cb(16);
        }
        observerCallback?.([{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry]);
      });
      expect(scrollToSpy).toHaveBeenCalledWith({ left: 0, behavior: 'auto' });
      expect(dialog.hasAttribute('open')).toBe(true);
      expect(useUIStore.getState().isMobileDrawerOpen).toBe(true);

      // Observer reports sheet entered view
      act(() => {
        observerCallback?.([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry]);
      });
      expect(dialog.hasAttribute('open')).toBe(true);

      // User swipes sheet off-screen -> observer reports < visibleThreshold -> closes cleanly
      act(() => {
        observerCallback?.([{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry]);
      });
      expect(dialog.hasAttribute('open')).toBe(false);
      expect(useUIStore.getState().isMobileDrawerOpen).toBe(false);
    } finally {
      if (origOffsetWidthDesc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', origOffsetWidthDesc);
      Element.prototype.scrollTo = origScrollTo;
    }
  });

  it('opens MobileSideDrawer on avatar click with user details and secondary links, and closes on link or Close click', () => {
    useAuthStore.setState({
      user: makeUser({ role: 'admin' }),
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    const { container } = renderWithProviders(
      <>
        <Header title="Inicio" />
        <MobileSideDrawer />
      </>,
      ['/']
    );

    const dialog = container.querySelector('#mobile-nav-drawer');
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute('open')).toBe(false);

    const trigger = screen.getByLabelText('Abrir menú de navegación');
    expect(trigger.className).not.toContain('rounded-full');
    expect(trigger.querySelector('div')?.className).not.toContain('rounded-full');

    fireEvent.click(trigger);

    expect(useUIStore.getState().isMobileDrawerOpen).toBe(true);
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    const drawerAvatarWrapper = dialog?.querySelector('img[alt="alice"]')?.closest('div');
    expect(drawerAvatarWrapper?.className).not.toContain('rounded-full');
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/alice');
    expect(screen.getByRole('link', { name: 'Guardados' })).toHaveAttribute('href', '/bookmarks');
    expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Moderación' })).toHaveAttribute('href', '/moderation');
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cerrar menú'));
    expect(useUIStore.getState().isMobileDrawerOpen).toBe(false);
    expect(dialog?.hasAttribute('open')).toBe(false);

    fireEvent.click(screen.getByLabelText('Abrir menú de navegación'));
    expect(dialog?.hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Guardados' }));
    expect(useUIStore.getState().isMobileDrawerOpen).toBe(false);
    expect(dialog?.hasAttribute('open')).toBe(false);
  });

  it('enables viewport-fit=cover and adapts MobileBottomNav safe-area inset padding for rounded/notched screens', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
    expect(html).toContain('viewport-fit=cover');

    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf-8');
    expect(css).toContain('.mobile-bottom-nav');
    expect(css).toContain('env(safe-area-inset-bottom, 0px)');
    expect(css).toContain('env(safe-area-inset-left, 0px)');
    expect(css).toContain('env(safe-area-inset-right, 0px)');
    expect(css).toContain('scroll-padding-bottom');

    const { container } = renderWithProviders(<MobileBottomNav />);
    const nav = container.querySelector('nav[aria-label="Navegación móvil"]');
    expect(nav?.className).toContain('mobile-bottom-nav');
  });
});
