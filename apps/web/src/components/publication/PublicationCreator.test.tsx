import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationCreator } from './PublicationCreator.js';
import { useAuthStore } from '../../stores/authStore.js';

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
});
