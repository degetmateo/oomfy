import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatsView } from '../src/views/ChatsView.js';
import { ChatThread } from '../src/components/chat/ChatThread.js';
import { ApiClient } from '../src/services/api.js';
import { SocketClient } from '../src/services/socket.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { chatIdentityMap } from '../src/models/ChatIdentityMap.js';

describe('ChatsView Resizable Split Pane & Escape Cancel Reply', () => {
  const sampleChat = {
    id: 'chat-resize-1',
    participants: [
      { id: 'u-me', username: 'me', name: 'Me', icon_url: null },
      { id: 'u-other', username: 'ana', name: 'Ana', icon_url: null },
    ],
    last_message: { id: 'm1', content: 'Hola!', sender_id: 'u-other', created_at: new Date().toISOString() },
    unread_count: 0,
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    chatIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true, token: 'tok',
      user: { id: 'u-me', username: 'me', name: 'Me', role: 'member' } as any,
    });
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue({ on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any);
  });

  it('resizes chat sidebar on desktop drag left/right and keyboard arrows, persisting width', () => {
    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [sampleChat] } as any);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/chats']}><ChatsView /></MemoryRouter></QueryClientProvider>
    );

    const separator = screen.getByTestId('chat-split-resizer');
    const sidebar = container.querySelector('.chat-sidebar-resizable') as HTMLElement;
    expect(sidebar.style.width).toBe('320px');

    fireEvent.mouseDown(separator, { clientX: 320 });
    fireEvent.mouseMove(window, { clientX: 460 });
    fireEvent.mouseUp(window);
    expect(sidebar.style.width).toBe('460px');
    expect(localStorage.getItem('oomfy_chat_sidebar_width')).toBe('460');

    fireEvent.mouseDown(separator, { clientX: 460 });
    fireEvent.mouseMove(window, { clientX: 100 });
    fireEvent.mouseUp(window);
    expect(sidebar.style.width).toBe('220px');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(sidebar.style.width).toBe('236px');
  });

  it('cancels active reply when pressing Escape in ChatThread and preserves reply if EmojiPicker consumes first Escape', async () => {
    const msg = {
      id: 'm-reply-target', chat_id: 'chat-resize-1', sender_id: 'u-other',
      sender: { id: 'u-other', username: 'ana', name: 'Ana' },
      content: 'Mensaje para responder', created_at: new Date().toISOString(),
    };
    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [msg] } as any);
    vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><ChatThread chat={sampleChat} currentUserId="u-me" /></MemoryRouter></QueryClientProvider>);

    await waitFor(() => expect(screen.getByText('Mensaje para responder')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Responder mensaje'));
    expect(screen.getByText(/Respondiendo a/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Emojis'));
    expect(screen.getByLabelText('Buscar emoji')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Buscar emoji')).not.toBeInTheDocument();
    expect(screen.getByText(/Respondiendo a/i)).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText('Escribe un mensaje...'), { key: 'Escape' });
    expect(screen.queryByText(/Respondiendo a/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Responder mensaje'));
    expect(screen.getByText(/Respondiendo a/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Respondiendo a/i)).not.toBeInTheDocument();
  });
});
