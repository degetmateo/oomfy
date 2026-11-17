import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatListSidebar } from '../src/components/chat/ChatListSidebar.js';
import { useChatsList } from '../src/hooks/useChatsList.js';
import { useChatMessages } from '../src/hooks/useChatMessages.js';
import { SocketClient } from '../src/services/socket.js';
import { ApiClient } from '../src/services/api.js';

function createMockSocket() {
  const listeners = new Map<string, Set<Function>>();
  return {
    on: (ev: string, fn: Function) => { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev)!.add(fn); },
    off: (ev: string, fn: Function) => listeners.get(ev)?.delete(fn),
    emit: vi.fn(),
    trigger: (ev: string, data?: any) => listeners.get(ev)?.forEach((fn) => fn(data)),
  };
}

describe('Chat Typing Indicator on Cards & Multi-Device Sync', () => {
  const queryClient = new QueryClient();
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSocket = createMockSocket();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue(mockSocket as any);
    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] });
    vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true });
  });

  it('renders typing indicator on chat card when typingChats has the chatId', () => {
    const mockChat = {
      id: 'chat-100', unread_count: 0,
      last_message: { content: 'Hola amigo', created_at: new Date().toISOString() },
    };
    const getOtherParticipant = () => ({ name: 'Juan', username: 'juan' });

    const { rerender } = render(
      <ChatListSidebar
        chats={[mockChat]} isLoading={false} selectedChatId={null} typingChats={{}}
        getOtherParticipant={getOtherParticipant} onSelectChat={vi.fn()} onOpenNewChat={vi.fn()}
      />
    );
    expect(screen.getByText('Hola amigo')).toBeInTheDocument();
    expect(screen.queryByText(/está escribiendo\.\.\./i)).not.toBeInTheDocument();

    rerender(
      <ChatListSidebar
        chats={[mockChat]} isLoading={false} selectedChatId={null} typingChats={{ 'chat-100': 'juan' }}
        getOtherParticipant={getOtherParticipant} onSelectChat={vi.fn()} onOpenNewChat={vi.fn()}
      />
    );
    expect(screen.getByText('juan está escribiendo...')).toBeInTheDocument();
  });

  it('useChatsList updates typingChats upon receiving user-typing socket event and clears on user-stop-typing', () => {
    const wrapper = ({ children }: any) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useChatsList('user-1', null), { wrapper });

    act(() => { mockSocket.trigger('user-typing', { chatId: 'chat-abc', userId: 'user-2', username: 'pedro' }); });
    expect(result.current.typingChats['chat-abc']).toBe('pedro');

    act(() => { mockSocket.trigger('user-stop-typing', { chatId: 'chat-abc', userId: 'user-2' }); });
    expect(result.current.typingChats['chat-abc']).toBeUndefined();
  });

  it('useChatMessages receives messages from new_chat_message for multi-device sync and orders them', () => {
    const wrapper = ({ children }: any) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useChatMessages('chat-sync', 'user-1', vi.fn()), { wrapper });

    const msg1 = { id: 'm-1', chat_id: 'chat-sync', sender_id: 'user-1', content: 'Primero', created_at: '2026-01-01T10:00:00Z' };
    const msg2 = { id: 'm-2', chat_id: 'chat-sync', sender_id: 'user-2', content: 'Segundo', created_at: '2026-01-01T10:01:00Z' };

    act(() => {
      mockSocket.trigger('new_chat_message', msg2);
      mockSocket.trigger('new-message', msg1);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe('m-1');
    expect(result.current.messages[1].id).toBe('m-2');
  });
});
