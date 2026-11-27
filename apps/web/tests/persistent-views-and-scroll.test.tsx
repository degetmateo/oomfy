import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicUser, Publication } from '@oomfy/shared';
import { PersistentViewHost } from '../src/components/layout/PersistentViewHost.js';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute.js';
import { SeoHead } from '../src/components/common/SeoHead.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { RouteScrollStore } from '../src/stores/routeScrollStore.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { usePublicationModel } from '../src/hooks/usePublicationModel.js';
import { useViewActive } from '../src/contexts/ViewActivityContext.js';
import { NotificationsView } from '../src/views/NotificationsView.js';
import { ApiClient } from '../src/services/api.js';
import { SocketClient } from '../src/services/socket.js';

const makeUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: 'u-me',
  username: 'alice',
  name: 'Alice',
  role: 'member',
  bio: null,
  pronouns: null,
  location: null,
  link: null,
  icon_url: null,
  banner_url: null,
  created_at: new Date().toISOString(),
  follower_count: 10,
  followed_count: 5,
  publication_count: 1,
  ...overrides,
});

const makePost = (id: string, content: string): Publication => ({
  id,
  author: { id: 'u-author', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
  type: 'default',
  content,
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images: [],
  embeds: [],
  upvotes_count: 1,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
});

const HostShell: React.FC = () => (
  <main className="relative">
    <PersistentViewHost isChatsRoute={false} />
  </main>
);

function renderHostRouter(routes: React.ReactElement, initialEntries: string[] = ['/']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{routes}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Persistent Views, Live Model Observation & Zero-Drift Scroll', () => {
  beforeEach(() => {
    RouteScrollStore.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({
      user: makeUser(),
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps visited view instances mounted and reflects background IdentityMap updates on return', () => {
    publicationIdentityMap.ingest([makePost('p-live', 'Contenido inicial')], Date.now());
    let mountCount = 0;

    const HomeFeedStub: React.FC = () => {
      const navigate = useNavigate();
      const post = usePublicationModel('p-live');
      const [localDraft, setLocalDraft] = useState('');
      React.useEffect(() => {
        mountCount += 1;
      }, []);

      return (
        <div>
          <SeoHead title="Inicio — Oomfy" description="Inicio" />
          <input
            aria-label="Borrador"
            value={localDraft}
            onChange={(e) => setLocalDraft(e.target.value)}
          />
          <p data-testid="live-post-content">{post?.content}</p>
          <button onClick={() => navigate('/settings')}>Ir a Settings</button>
        </div>
      );
    };

    const SettingsStub: React.FC = () => {
      const navigate = useNavigate();
      return (
        <div>
          <SeoHead title="Configuración — Oomfy" description="Ajustes" />
          <button onClick={() => navigate(-1)}>Volver</button>
        </div>
      );
    };

    const { container } = renderHostRouter(
      <Routes>
        <Route element={<HostShell />}>
          <Route path="/" element={<HomeFeedStub />} />
          <Route path="/settings" element={<SettingsStub />} />
        </Route>
      </Routes>
    );

    expect(mountCount).toBe(1);
    expect(document.title).toBe('Inicio — Oomfy');
    fireEvent.change(screen.getByLabelText('Borrador'), { target: { value: 'sin perder estado' } });

    fireEvent.click(screen.getByText('Ir a Settings'));
    expect(document.title).toBe('Configuración — Oomfy');

    // Home pane is hidden & inert, not unmounted
    const homePane = container.querySelector('[data-view-key="/"]')!;
    expect(homePane.getAttribute('aria-hidden')).toBe('true');

    // Update model in background while '/' is inactive
    act(() => {
      publicationIdentityMap.patch('p-live', (p) => ({ ...p, content: 'Actualizado en segundo plano' }));
    });

    // Return to '/'
    fireEvent.click(screen.getByText('Volver'));
    expect(mountCount).toBe(1);
    expect(document.title).toBe('Inicio — Oomfy');
    expect((screen.getByLabelText('Borrador') as HTMLInputElement).value).toBe('sin perder estado');
    expect(screen.getByTestId('live-post-content')).toHaveTextContent('Actualizado en segundo plano');
  });

  it('restores exact scroll anchor offset without drift when prepended items shift layout', () => {
    let currentY = 1200;
    // Anchor sits at document y = 1320 so when window.scrollY === 1200, rect.top === 120
    let anchorDocY = 1320;

    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => currentY);
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation((arg: any, yArg?: number) => {
      currentY = typeof arg === 'object' ? arg.top ?? 0 : yArg ?? 0;
    });
    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation((arg: any, yArg?: number) => {
      const delta = typeof arg === 'object' ? arg.top ?? 0 : yArg ?? 0;
      currentY += delta;
    });

    const ListStub: React.FC = () => {
      const navigate = useNavigate();
      return (
        <div>
          <div
            data-scroll-anchor="post-5"
            ref={(el) => {
              if (!el) return;
              el.getBoundingClientRect = () => {
                const top = anchorDocY - currentY;
                return { top, bottom: top + 100, height: 100, width: 320, left: 0, right: 320 } as DOMRect;
              };
            }}
          >
            Post 5
          </div>
          <button onClick={() => navigate('/publication/1')}>Abrir post</button>
        </div>
      );
    };

    const DetailStub: React.FC = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate(-1)}>Volver al feed</button>;
    };

    renderHostRouter(
      <Routes>
        <Route element={<HostShell />}>
          <Route path="/" element={<ListStub />} />
          <Route path="/publication/:id" element={<DetailStub />} />
        </Route>
      </Routes>
    );

    fireEvent.click(screen.getByText('Abrir post'));
    expect(currentY).toBe(0);

    // Simulate +240px new content prepended while away
    anchorDocY += 240;

    fireEvent.click(screen.getByText('Volver al feed'));
    expect(scrollToSpy).toHaveBeenCalled();
    expect(scrollBySpy).toHaveBeenCalledWith(0, 240);
    expect(currentY).toBe(1440);
    expect(anchorDocY - currentY).toBe(120);
  });

  it('evicts oldest dynamic routes beyond cap while keeping pinned routes mounted', () => {
    const DynView: React.FC = () => {
      const { id } = useParams<{ id: string }>();
      const navigate = useNavigate();
      return (
        <div>
          <span>Post {id}</span>
          <button onClick={() => navigate('/')}>Home</button>
        </div>
      );
    };
    const SimpleView: React.FC<{ name: string }> = ({ name }) => <div>{name}</div>;

    const NavDriver: React.FC = () => {
      const navigate = useNavigate();
      return (
        <>
          <button data-testid="go-explore" onClick={() => navigate('/explore')} />
          <button data-testid="go-notifs" onClick={() => navigate('/notifications')} />
          <button data-testid="go-chats" onClick={() => navigate('/chats')} />
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} data-testid={`go-p${n}`} onClick={() => navigate(`/publication/${n}`)} />
          ))}
        </>
      );
    };

    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <NavDriver />
          <Routes>
            <Route element={<HostShell />}>
              <Route path="/" element={<SimpleView name="Inicio" />} />
              <Route path="/explore" element={<SimpleView name="Explorar" />} />
              <Route path="/notifications" element={<SimpleView name="Notifs" />} />
              <Route path="/chats" element={<SimpleView name="Chats" />} />
              <Route path="/publication/:id" element={<DynView />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(container.querySelector('[data-testid="go-explore"]')!);
    fireEvent.click(container.querySelector('[data-testid="go-notifs"]')!);
    fireEvent.click(container.querySelector('[data-testid="go-chats"]')!);
    for (let n = 1; n <= 7; n++) {
      fireEvent.click(container.querySelector(`[data-testid="go-p${n}"]`)!);
    }

    expect(container.querySelector('[data-view-key="/"]')).not.toBeNull();
    expect(container.querySelector('[data-view-key="/explore"]')).not.toBeNull();
    expect(container.querySelector('[data-view-key="/notifications"]')).not.toBeNull();
    expect(container.querySelector('[data-view-key="/chats"]')).not.toBeNull();
    expect(container.querySelector('[data-view-key="/publication/1"]')).toBeNull();
    expect(container.querySelector('[data-view-key="/publication/7"]')).not.toBeNull();
  });

  it('never caches rejected ProtectedRoute and wipes cache synchronously on logout without redirecting off /', () => {
    const AdminStub: React.FC = () => <div>Admin Panel</div>;
    const SettingsStub: React.FC = () => {
      const navigate = useNavigate();
      return (
        <div>
          <span>User Settings</span>
          <button onClick={() => navigate('/')}>Return Home</button>
        </div>
      );
    };
    const HomeStub: React.FC = () => {
      const navigate = useNavigate();
      return (
        <div>
          <span>Public Home</span>
          <button onClick={() => navigate('/admin')}>Try Admin</button>
          <button onClick={() => navigate('/settings')}>Settings</button>
          <button onClick={() => useAuthStore.getState().logout(false)}>Logout</button>
        </div>
      );
    };

    const { container } = renderHostRouter(
      <Routes>
        <Route element={<HostShell />}>
          <Route path="/" element={<HomeStub />} />
          <Route path="/settings" element={<ProtectedRoute><SettingsStub /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminStub /></ProtectedRoute>} />
        </Route>
        <Route path="/signin" element={<div>Signin Page</div>} />
      </Routes>,
      ['/']
    );

    // Non-admin tries /admin -> redirected back to '/' and /admin is NOT cached
    fireEvent.click(screen.getByText('Try Admin'));
    expect(screen.getByText('Public Home')).toBeInTheDocument();
    expect(container.querySelector('[data-view-key="/admin"]')).toBeNull();

    // Navigating to /settings afterwards is NOT trapped back to '/'
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('User Settings')).toBeInTheDocument();

    // Return home, then logout -> synchronous cache wipe keeps guest on '/' (not hijacked to /signin)
    fireEvent.click(screen.getByText('Return Home'));
    expect(screen.getByText('Public Home')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Logout'));
    expect(screen.getByText('Public Home')).toBeInTheDocument();
    expect(screen.queryByText('Signin Page')).toBeNull();
    expect(container.querySelector('[data-view-key="/settings"]')).toBeNull();
  });

  it('prevents background NotificationsView from auto-marking new notifications read while inactive', async () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);
    vi.spyOn(ApiClient, 'get').mockResolvedValue({
      success: true,
      data: { notifications: [], pendingCount: 0 },
    } as any);

    const NavBar: React.FC = () => {
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => navigate('/notifications')}>Go Notifs</button>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      );
    };

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/notifications']}>
          <NavBar />
          <Routes>
            <Route element={<HostShell />}>
              <Route path="/" element={<div>Home View</div>} />
              <Route path="/notifications" element={<NotificationsView />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Leave notifications view
    fireEvent.click(screen.getByText('Go Home'));
    postSpy.mockClear();

    // New pending notification data arrives while NotificationsView is inactive in background
    act(() => {
      qc.setQueryData(['notifications-infinite-list'], {
        pages: [{ success: true, data: { notifications: [], pendingCount: 2 } }],
        pageParams: [''],
      });
    });

    expect(postSpy).not.toHaveBeenCalledWith('/notifications/read');

    // Return to notifications -> now marks read!
    fireEvent.click(screen.getByText('Go Notifs'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(postSpy).toHaveBeenCalledWith('/notifications/read');
    expect(SocketClient.getActiveChatId()).toBeNull();
    expect(typeof useViewActive).toBe('function');
  });
});
