import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReplyComposer } from './ReplyComposer.js';
import { useAuthStore } from '../../stores/authStore.js';

describe('ReplyComposer Component', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-1', username: 'testuser', name: 'Tester', role: 'user' } as any,
    });
  });

  const renderComponent = (props: any) =>
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ReplyComposer {...props} />
        </QueryClientProvider>
      </MemoryRouter>
    );

  it('renders emoji button and inserts emoji into reply textarea', () => {
    renderComponent({ targetId: 'pub-1', onSubmit: vi.fn(), isSubmitting: false });
    const emojiBtn = screen.getByTitle('Emojis');
    expect(emojiBtn).toBeInTheDocument();

    fireEvent.click(emojiBtn);
    expect(screen.getByText('😀')).toBeInTheDocument();

    fireEvent.click(screen.getByText('😀'));
    const textarea = screen.getByPlaceholderText('Publicar tu respuesta...') as HTMLTextAreaElement;
    expect(textarea.value).toContain('😀');
  });

  it('bypasses cropper for GIF files', () => {
    const { container } = renderComponent({ targetId: 'pub-1', onSubmit: vi.fn(), isSubmitting: false });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const gifFile = new File(['gif'], 'reaction.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    expect(screen.getByText(/reaction\.gif/i)).toBeInTheDocument();
  });
});
