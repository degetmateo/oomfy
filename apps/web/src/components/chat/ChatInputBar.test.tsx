import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInputBar } from './ChatInputBar.js';

describe('ChatInputBar Component', () => {
  const queryClient = new QueryClient();

  const renderComponent = (props: any) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ChatInputBar {...props} />
      </QueryClientProvider>
    );

  it('renders emoji toggle and allows inserting emoji into message', () => {
    const onSend = vi.fn();
    const onTyping = vi.fn();

    renderComponent({
      replyingTo: null,
      onCancelReply: vi.fn(),
      onSendMessage: onSend,
      onTyping,
      isSending: false,
    });

    const emojiBtn = screen.getByTitle('Emojis');
    expect(emojiBtn).toBeInTheDocument();

    fireEvent.click(emojiBtn);
    expect(screen.getByText('😀')).toBeInTheDocument();

    fireEvent.click(screen.getByText('😀'));
    const input = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLTextAreaElement;
    expect(input.value).toBe('😀');
  });
});
