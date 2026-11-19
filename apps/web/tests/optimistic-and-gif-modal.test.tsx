import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { KlipyGifModal } from '../src/components/publication/KlipyGifModal.js';
import { PublicationCreator } from '../src/components/publication/PublicationCreator.js';
import { PublicationToastBanner } from '../src/components/common/PublicationToastBanner.js';
import { submitOptimisticReply } from '../src/controllers/optimisticPublicationHelpers.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useToastStore } from '../src/stores/toastStore.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';

describe('Fixed-Height GIF Modal, Optimistic Publishing & Dismissible Toast Banner', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    publicationIdentityMap.clear();
    useToastStore.setState({ toast: null });
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member' } as any,
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('KlipyGifModal opens with a fixed initial height (h-[34rem]) before GIFs load', () => {
    vi.spyOn(ApiClient, 'get').mockReturnValue(new Promise(() => {}) as any);
    render(
      <QueryClientProvider client={client}>
        <KlipyGifModal isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
      </QueryClientProvider>
    );
    const dialog = screen.getByRole('dialog');
    const panel = dialog.firstElementChild as HTMLElement;
    expect(panel.className).toContain('h-[34rem]');
    expect(panel.className).toContain('max-h-[85vh]');
  });

  it('inserts optimistic post immediately, commits on success with dismissible/swipeable toast, and rolls back on error', async () => {
    client.setQueryData(['feed', 'global'], { pages: [{ success: true, data: [] }], pageParams: [null] });
    let resolvePost!: (v: any) => void;
    vi.spyOn(ApiClient, 'post').mockImplementationOnce(() => new Promise((r) => { resolvePost = r; }) as any);

    render(
      <QueryClientProvider client={client}>
        <PublicationToastBanner />
        <PublicationCreator />
      </QueryClientProvider>
    );

    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Mi post optimista' } });
    fireEvent.submit(textarea.closest('form')!);

    expect(textarea.value).toBe('');
    const cachedBefore: any = client.getQueryData(['feed', 'global']);
    expect(cachedBefore.pages[0].data[0].id).toMatch(/^temp-pub-/);
    expect(cachedBefore.pages[0].data[0].content).toBe('Mi post optimista');

    const serverPub: Publication = {
      ...cachedBefore.pages[0].data[0],
      id: 'real-pub-1',
    };
    resolvePost({ success: true, data: serverPub });

    await waitFor(() => expect(screen.getByText('¡Publicación enviada!')).toBeInTheDocument());
    const cachedAfter: any = client.getQueryData(['feed', 'global']);
    expect(cachedAfter.pages[0].data[0].id).toBe('real-pub-1');

    fireEvent.click(screen.getByText('¡Publicación enviada!'));
    expect(screen.queryByText('¡Publicación enviada!')).not.toBeInTheDocument();

    const parentPost: Publication = { ...serverPub, id: 'parent-1', comments_count: 0 };
    client.setQueryData(['publication', 'parent-1'], { publication: parentPost, replies: [], thread: [] });
    let rejectReply!: (err: Error) => void;
    vi.spyOn(ApiClient, 'post').mockImplementationOnce(() => new Promise((_, r) => { rejectReply = r; }) as any);

    submitOptimisticReply(client, new FormData(), useAuthStore.getState().user, parentPost, { content: 'Fallará', files: [], gifs: [] });
    const detailOpt: any = client.getQueryData(['publication', 'parent-1']);
    expect(detailOpt.replies).toHaveLength(1);
    expect(detailOpt.replies[0].content).toBe('Fallará');

    rejectReply(new Error('Network error'));
    const errAlert = await screen.findByText(/Ha ocurrido un error/i);
    expect((client.getQueryData(['publication', 'parent-1']) as any).replies).toHaveLength(0);

    fireEvent.touchStart(errAlert, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(errAlert, { touches: [{ clientY: 65 }] });
    expect(screen.queryByText(/Ha ocurrido un error/i)).not.toBeInTheDocument();
  });
});
