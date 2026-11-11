import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInputBar } from '../src/components/chat/ChatInputBar.js';
import { ChatMessageItem } from '../src/components/chat/ChatMessageItem.js';
import { ChatMessageMedia } from '../src/components/chat/ChatMessageMedia.js';
import { NotificationItem } from '../src/components/notifications/NotificationItem.js';

describe('Chat Optimistic UI, Media Alignment & Notification Highlight', () => {
  it('clears ChatInputBar immediately upon submit before async send completes', () => {
    let resolveSend: () => void;
    const onSend = vi.fn(() => new Promise<void>((res) => { resolveSend = res; }));
    const qc = new QueryClient();

    render(
      <QueryClientProvider client={qc}>
        <ChatInputBar
          replyingTo={null}
          onCancelReply={vi.fn()}
          onSendMessage={onSend}
          onTyping={vi.fn()}
        />
      </QueryClientProvider>
    );

    const textarea = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Mensaje instantáneo' } });
    expect(textarea.value).toBe('Mensaje instantáneo');

    fireEvent.submit(textarea.closest('form')!);
    expect(textarea.value).toBe('');
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ content: 'Mensaje instantáneo' }));
    resolveSend!();
  });

  it('displays Discord-style red error state with retry and delete buttons when message fails', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    const failedMessage = {
      id: 'temp-1',
      sender_id: 'u1',
      sender: { id: 'u1', username: 'alice', name: 'Alice' },
      content: 'Mensaje fallido',
      created_at: new Date().toISOString(),
      deliveryState: 'error',
    };

    render(
      <MemoryRouter>
        <ChatMessageItem
          message={failedMessage}
          isMe
          onRetry={onRetry}
          onDismissError={onDismiss}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Error al enviar/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Reintentar/i));
    expect(onRetry).toHaveBeenCalledWith(failedMessage);

    fireEvent.click(screen.getByText(/Eliminar/i));
    expect(onDismiss).toHaveBeenCalledWith('temp-1');
  });

  it('renders ChatMessageMedia aligned cleanly with uploaded and GIF images', () => {
    const { container } = render(
      <ChatMessageMedia mediaUrls={['https://i.ibb.co/pic.png']} gifUrl="https://media.tenor.com/1.gif" />
    );
    const imgs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(imgs).toEqual(['https://media.tenor.com/1.gif', 'https://i.ibb.co/pic.png']);
  });

  it('highlights unread NotificationItem with NUEVO badge', () => {
    const notif: any = {
      id: 'n1', type: 'upvote', status: 'pending', target_publication_id: 'p1', created_at: new Date().toISOString(),
      sender: { id: 'u2', username: 'bob', name: 'Bob', icon_url: null },
    };
    const { rerender } = render(<MemoryRouter><NotificationItem notif={notif} isUnread /></MemoryRouter>);
    expect(screen.getByText('NUEVO')).toBeTruthy();
    rerender(<MemoryRouter><NotificationItem notif={{ ...notif, status: 'seen' }} isUnread={false} /></MemoryRouter>);
    expect(screen.queryByText('NUEVO')).toBeNull();
  });
});
