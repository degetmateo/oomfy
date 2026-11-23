import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { PublicationDetailView } from '../src/views/PublicationDetailView.js';
import { ReplyThreadGroup } from '../src/components/publication/ReplyThreadGroup.js';
import { ThreadAncestorsList } from '../src/components/publication/ThreadAncestorsList.js';
import { RouteErrorBoundary } from '../src/components/common/RouteErrorBoundary.js';
import { ApiClient } from '../src/services/api.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';

const mkAuthor = (id: string, username: string) => ({
  id,
  username,
  name: username,
  role: 'member' as const,
  icon_url: null,
  banner_url: null,
});

const mkPub = (overrides: Partial<Publication> & { id: string; content: string }): Publication => ({
  author: mkAuthor('u-1', 'ada'),
  type: 'default',
  created_at: new Date().toISOString(),
  parent_publication_id: null,
  root_publication_id: null,
  images: [],
  embeds: [],
  upvotes_count: 0,
  shares_count: 0,
  quotes_count: 0,
  comments_count: 0,
  ...overrides,
});

describe('Thread Navigation & Subthread Stability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    userIdentityMap.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  });

  it('navigates across cached thread replies and ancestors in BrowserRouter without starving transitions or triggering update depth loops', async () => {
    const rootAuthor = mkAuthor('u-root', 'rootuser');
    const leafAuthor = mkAuthor('u-leaf', 'leafuser');
    const secondAuthor = mkAuthor('u-second', 'seconduser');
    const subAuthor = mkAuthor('u-sub', 'subuser');

    const rootPub = mkPub({ id: 'root-1', author: rootAuthor, content: 'Publicación raíz del hilo' });
    const leafReply = mkPub({
      id: 'reply-1',
      author: leafAuthor,
      type: 'reply',
      parent_publication_id: 'root-1',
      root_publication_id: 'root-1',
      content: 'Respuesta hoja sin subhilo',
      subthread_preview: undefined,
      subthread_remaining_count: 0,
    });
    const subItem = mkPub({
      id: 'sub-1',
      author: subAuthor,
      type: 'reply',
      parent_publication_id: 'reply-2',
      root_publication_id: 'root-1',
      content: 'Subrespuesta dentro del hilo',
    });
    const branchReply = mkPub({
      id: 'reply-2',
      author: secondAuthor,
      type: 'reply',
      parent_publication_id: 'root-1',
      root_publication_id: 'root-1',
      content: 'Segunda respuesta navegable',
      subthread_preview: [subItem],
      subthread_remaining_count: 0,
    });

    vi.spyOn(ApiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/publications/root-1') {
        return {
          success: true,
          data: { publication: rootPub, ancestors: [], replies: [leafReply, branchReply], has_more_ancestors: false, total_ancestors: 0 },
        } as any;
      }
      if (url === '/publications/reply-1') {
        return {
          success: true,
          data: { publication: leafReply, ancestors: [rootPub], replies: [], has_more_ancestors: false, total_ancestors: 1 },
        } as any;
      }
      if (url === '/publications/reply-2') {
        return {
          success: true,
          data: { publication: branchReply, ancestors: [rootPub], replies: [], has_more_ancestors: false, total_ancestors: 1 },
        } as any;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.history.replaceState({}, '', '/publication/root-1');

    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Routes>
            <Route path="/publication/:id" element={<PublicationDetailView />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Respuesta hoja sin subhilo')).toBeInTheDocument();
    });

    // Click leaf reply to navigate to /publication/reply-1
    fireEvent.click(screen.getByText('Respuesta hoja sin subhilo'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/publication/reply-1');
      expect(screen.getByText('Publicación raíz del hilo')).toBeInTheDocument();
    });

    // Navigate back to cached /publication/root-1 via ancestor card (triggers background refetchOnMount)
    fireEvent.click(screen.getByText('Publicación raíz del hilo'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/publication/root-1');
      expect(screen.getByText('Segunda respuesta navegable')).toBeInTheDocument();
    });

    // Let passive effects & background refetch settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });

    // Click second reply: BOTH window.location.pathname AND view content must switch to /publication/reply-2
    fireEvent.click(screen.getByText('Segunda respuesta navegable'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/publication/reply-2');
      expect(screen.getByText('No hay respuestas todavía. ¡Sé el primero en responder!')).toBeInTheDocument();
    });

    const depthErrors = errSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && /Maximum update depth exceeded/i.test(a))
    );
    expect(depthErrors).toHaveLength(0);
  });

  it('ReplyThreadGroup handles undefined subthread_preview across re-renders and preserves loaded items on same signature', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const leaf = mkPub({
      id: 'leaf-r1',
      type: 'reply',
      content: 'Hoja estable',
      subthread_preview: undefined,
      subthread_remaining_count: 0,
    });

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ReplyThreadGroup reply={leaf} rootAuthorId="u-root" rootAuthorUsername="root" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    for (let i = 0; i < 4; i++) {
      rerender(
        <QueryClientProvider client={qc}>
          <BrowserRouter>
            <ReplyThreadGroup
              reply={{ ...leaf }}
              rootAuthorId="u-root"
              rootAuthorUsername="root"
            />
          </BrowserRouter>
        </QueryClientProvider>
      );
    }

    const depthErrors = errSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && /Maximum update depth exceeded/i.test(a))
    );
    expect(depthErrors).toHaveLength(0);

    // Now test pagination preservation + reset on rootId change
    const sub1 = mkPub({ id: 'sub-1', type: 'reply', content: 'Sub inicial' });
    const sub2 = mkPub({ id: 'sub-2', type: 'reply', content: 'Sub cargada extra' });
    const paginatedReply = mkPub({
      id: 'pag-r1',
      type: 'reply',
      content: 'Padre paginado',
      subthread_preview: [sub1],
      subthread_remaining_count: 1,
    });

    vi.spyOn(ApiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { items: [sub2], remaining: 0, has_more: false },
    } as any);

    rerender(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ReplyThreadGroup reply={paginatedReply} rootAuthorId="u-root" rootAuthorUsername="root" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Mostrar más respuestas/i }));
    await waitFor(() => expect(screen.getByText('Sub cargada extra')).toBeInTheDocument());

    // Parent re-renders with new object & array reference but same preview IDs & remaining count -> keep loaded sub2
    rerender(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ReplyThreadGroup
            reply={{ ...paginatedReply, subthread_preview: [{ ...sub1 }] }}
            rootAuthorId="u-root"
            rootAuthorUsername="root"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Sub cargada extra')).toBeInTheDocument();

    // Switching reply.id resets paginated items cleanly
    const otherSub = mkPub({ id: 'sub-other', type: 'reply', content: 'Sub de otro hilo' });
    const otherReply = mkPub({
      id: 'pag-r2',
      type: 'reply',
      content: 'Otro padre',
      subthread_preview: [otherSub],
      subthread_remaining_count: 0,
    });
    rerender(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ReplyThreadGroup reply={otherReply} rootAuthorId="u-root" rootAuthorUsername="root" />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByText('Sub cargada extra')).toBeNull();
    expect(screen.getByText('Sub de otro hilo')).toBeInTheDocument();
  });

  it('ThreadAncestorsList does not recreate IntersectionObserver across identical re-renders', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const ctorSpy = vi.fn();
    class MockIntersectionObserver {
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
      constructor() { ctorSpy(); }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const anc1 = mkPub({ id: 'anc-1', content: 'Ancestro uno' });
    const initialAncestors = [anc1];

    const { rerender } = render(
      <BrowserRouter>
        <ThreadAncestorsList
          publicationId="child-1"
          initialAncestors={initialAncestors}
          hasMoreInitial={true}
          totalAncestors={3}
        />
      </BrowserRouter>
    );

    expect(ctorSpy).toHaveBeenCalledTimes(1);

    rerender(
      <BrowserRouter>
        <ThreadAncestorsList
          publicationId="child-1"
          initialAncestors={initialAncestors}
          hasMoreInitial={true}
          totalAncestors={3}
        />
      </BrowserRouter>
    );

    expect(ctorSpy).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('RouteErrorBoundary isolates view errors and resets automatically on navigation to another route', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const BoomView: React.FC = () => {
      throw new Error('Crash simulado en vista');
    };
    const OkView: React.FC = () => <div>Vista saludable</div>;

    const Harness: React.FC = () => {
      const navigate = useNavigate();
      const location = useLocation();
      return (
        <>
          <button type="button" onClick={() => navigate('/ok')}>Navegar a ruta sana</button>
          <RouteErrorBoundary resetKey={`${location.pathname}${location.search}`}>
            <Routes>
              <Route path="/boom" element={<BoomView />} />
              <Route path="/ok" element={<OkView />} />
            </Routes>
          </RouteErrorBoundary>
        </>
      );
    };

    render(
      <MemoryRouter initialEntries={['/boom']}>
        <Harness />
      </MemoryRouter>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ocurrió un error al mostrar esta vista.');

    fireEvent.click(screen.getByRole('button', { name: /Navegar a ruta sana/i }));
    expect(screen.getByText('Vista saludable')).toBeInTheDocument();
  });
});
