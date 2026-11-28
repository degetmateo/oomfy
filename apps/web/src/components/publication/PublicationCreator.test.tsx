import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationCreator } from './PublicationCreator.js';
import { useAuthStore } from '../../stores/authStore.js';
import { ApiClient } from '../../services/api.js';

describe('PublicationCreator Component', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-1', username: 'testuser', name: 'Tester', role: 'user' } as any,
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <PublicationCreator />
      </QueryClientProvider>
    );

  it('renders emoji button and inserts emoji into textarea', () => {
    renderComponent();
    const emojiBtn = screen.getByTitle('Emojis');
    expect(emojiBtn).toBeInTheDocument();

    fireEvent.click(emojiBtn);
    expect(screen.getByText('😀')).toBeInTheDocument();

    fireEvent.click(screen.getByText('😀'));
    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    expect(textarea.value).toContain('😀');
  });

  it('directly adds GIF files without opening crop modal', () => {
    const { container } = renderComponent();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const gifFile = new File(['gif'], 'funny.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    expect(screen.getByText(/funny\.gif/i)).toBeInTheDocument();
  });

  it('auto-grows textarea vertically up to 320px before scrolling and resets when cleared', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?') as HTMLTextAreaElement;
    expect((textarea.style as CSSStyleDeclaration & { fieldSizing?: string }).fieldSizing || textarea.style.getPropertyValue('field-sizing')).toBe('content');

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, get: () => (textarea.value.length > 50 ? 450 : textarea.value ? 180 : 60) });
    fireEvent.change(textarea, { target: { value: 'Linea 1\nLinea 2\nLinea 3' } });
    expect(textarea.style.height).toBe('180px');
    expect(textarea.style.overflowY).toBe('hidden');

    fireEvent.change(textarea, { target: { value: 'a'.repeat(80) } });
    expect(textarea.style.height).toBe('320px');
    expect(textarea.style.overflowY).toBe('auto');

    fireEvent.change(textarea, { target: { value: '' } });
    expect(textarea.style.height).toBe('auto');
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('allows flagging an attached GIF as Spoiler or Contenido sensible and sends image_warnings in FormData', () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true, data: null });
    const { container } = renderComponent();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const gifFile = new File(['gif'], 'spoiler-clip.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    const flagBtn = screen.getByRole('button', { name: /Marcar advertencia de contenido: spoiler-clip\.gif/i });
    fireEvent.click(flagBtn);

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Spoiler' }));
    expect(screen.getByText('Spoiler')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(postSpy).toHaveBeenCalledTimes(1);
    const formData = postSpy.mock.calls[0][1] as FormData;
    expect(formData.get('image_warnings')).toBe(JSON.stringify(['spoiler']));
    postSpy.mockRestore();
  });
});
