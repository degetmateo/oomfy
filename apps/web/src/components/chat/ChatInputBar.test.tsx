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

  it('autofocuses the message input when replyingTo is set', async () => {
    const { rerender } = renderComponent({
      replyingTo: null,
      onCancelReply: vi.fn(),
      onSendMessage: vi.fn(),
      onTyping: vi.fn(),
    });

    const textarea = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLTextAreaElement;
    const focusSpy = vi.spyOn(textarea, 'focus');

    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatInputBar
          replyingTo={{ id: 'm-123', content: 'Pregunta', sender: { username: 'ana' } }}
          onCancelReply={vi.fn()}
          onSendMessage={vi.fn()}
          onTyping={vi.fn()}
        />
      </QueryClientProvider>
    );

    await new Promise((r) => requestAnimationFrame(r));
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('keeps/autofocuses textarea on submit and prevents blur on pointerDown', async () => {
    const onSend = vi.fn();
    renderComponent({
      replyingTo: null, onCancelReply: vi.fn(), onSendMessage: onSend, onTyping: vi.fn(),
    });
    const textarea = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLTextAreaElement;
    const focusSpy = vi.spyOn(textarea, 'focus');
    fireEvent.change(textarea, { target: { value: 'Hola oomfies' } });

    const sendBtn = screen.getByRole('button', { name: /enviar mensaje/i });
    const pointerEv = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    sendBtn.dispatchEvent(pointerEv);
    expect(pointerEv.defaultPrevented).toBe(true);

    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
