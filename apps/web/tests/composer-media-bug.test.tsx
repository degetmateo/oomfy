import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationCreator } from '../src/components/publication/PublicationCreator.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { ApiClient } from '../src/services/api.js';

describe('PublicationCreator Media & GIF Bug Regression', () => {
  const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', username: 'tester', name: 'Tester', role: 'member' } as any });
  });

  it('preserves text content and submits only once when adding a GIF via KlipyGifModal', async () => {
    vi.spyOn(ApiClient, 'get').mockResolvedValue({
      success: true,
      data: [{ id: 'g1', url: 'https://klipy.com/cat.gif', preview_url: 'https://klipy.com/cat-prev.gif', title: 'Cat' }],
    });
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true, data: { id: 'pub-1' } });

    const { container } = wrap(<PublicationCreator />);
    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Mi texto con gif' } });

    fireEvent.click(screen.getByRole('button', { name: 'Buscar GIF' }));
    const searchInput = await screen.findByPlaceholderText('Buscar GIFs...');
    const form = container.querySelector('form')!;
    expect(form.contains(searchInput)).toBe(false);

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    expect(postSpy).not.toHaveBeenCalled();
    expect(textarea.value).toBe('Mi texto con gif');

    const gifBtn = await screen.findByRole('button', { name: /Seleccionar GIF: Cat/i });
    fireEvent.click(gifBtn);
    expect(textarea.value).toBe('Mi texto con gif');
    expect(container.querySelector('img[src="https://klipy.com/cat.gif"]')).toBeInTheDocument();

    fireEvent.submit(form);
    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(1));
    const sentBody = postSpy.mock.calls[0][1] as FormData;
    expect(sentBody.get('content')).toBe('Mi texto con gif');
    expect(sentBody.get('tenor')).toContain('https://klipy.com/cat.gif');
  });

  it('isolates ImageCropperModal via portal outside form and preserves text when attaching an image', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true });

    const { container } = wrap(<PublicationCreator />);
    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Texto con imagen' } });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pngFile = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    const cropTitle = screen.getByText('Recortar imagen');
    const form = container.querySelector('form')!;
    expect(form.contains(cropTitle)).toBe(false);

    fireEvent.keyDown(cropTitle, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(form);
    expect(postSpy).not.toHaveBeenCalled();
    expect(textarea.value).toBe('Texto con imagen');
  });
});
