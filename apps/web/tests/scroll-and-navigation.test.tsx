import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/stores/authStore.js';
import { RouteScrollStore } from '../src/stores/routeScrollStore.js';
import { useRouteScroll } from '../src/hooks/useRouteScroll.js';
import { Navbar } from '../src/components/layout/Navbar.js';
import { MobileBottomNav } from '../src/components/layout/MobileBottomNav.js';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute.js';

const ScrollHarness: React.FC = () => {
  useRouteScroll();
  return <Outlet />;
};

describe('Per-View Scroll Restoration & Guest Navigation Restrictions', () => {
  let scrollYSpy: ReturnType<typeof vi.spyOn>;
  let currentY = 0;

  beforeEach(() => {
    cleanup();
    RouteScrollStore.clear();
    currentY = 0;
    scrollYSpy = vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => currentY);
    vi.spyOn(window, 'scrollTo').mockImplementation((arg: any, yArg?: number) => {
      currentY = typeof arg === 'object' ? arg.top ?? 0 : yArg ?? 0;
    });
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  });

  it('isolates scroll per view and restores scroll when returning back', () => {
    const Page = ({ label, to, nextLabel }: { label: string; to: string; nextLabel: string }) => {
      const navigate = useNavigate();
      return (
        <div>
          <h1>{label}</h1>
          <button onClick={() => navigate(to)}>{nextLabel}</button>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ScrollHarness />}>
            <Route path="/" element={<Page label="TL View" to="/notifications" nextLabel="Go Notifs" />} />
            <Route path="/notifications" element={<Page label="Notifs View" to="/publication/1" nextLabel="Go Post" />} />
            <Route path="/publication/:id" element={<Page label="Detail View" to="/" nextLabel="Go Home" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    currentY = 1200;
    fireEvent.scroll(window);

    fireEvent.click(screen.getByText('Go Notifs'));
    expect(screen.getByText('Notifs View')).toBeInTheDocument();
    expect(currentY).toBe(0);

    currentY = 450;
    fireEvent.scroll(window);

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('TL View')).toBeInTheDocument();
    expect(currentY).toBe(1200);
    scrollYSpy.mockRestore();
  });

  it('hides navigation buttons in Navbar and MobileBottomNav for unauthenticated guests and blocks non-guest routes', () => {
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/explore']}>
          <Navbar />
          <MobileBottomNav />
          <Routes>
            <Route path="/explore" element={<ProtectedRoute><div>Explore</div></ProtectedRoute>} />
            <Route path="/signin" element={<div>Signin Gate</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Notificaciones')).toBeNull();
    expect(screen.queryByText('Mensajes')).toBeNull();
    expect(container.querySelectorAll('nav')).toHaveLength(0);
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument();
    expect(screen.getByText('Signin Gate')).toBeInTheDocument();
  });
});

