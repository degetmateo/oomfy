import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatsView } from '../src/views/ChatsView.js';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync.js';
import { chatIdentityMap } from '../src/models/ChatIdentityMap.js';
import { ApiClient } from '../src/services/api.js';
import { SocketClient } from '../src/services/socket.js';
import { useAuthStore } from '../src/stores/authStore.js';

function createMockSocket() {
  const listeners = new Map<string, Set<Function>>();
  return {
    connected: true,
    on: (ev: string, fn: Function) => {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(fn);
    },
    once: (ev: string, fn: Function) => {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(fn);
    },
    off: (ev: string, fn: Function) => listeners.get(ev)?.delete(fn),
    emit: vi.fn(),
    connect: vi.fn(),
    trigger: (ev: string, data?: any) => listeners.get(ev)?.forEach((fn) => fn(data)),
  };
}

const RealtimeBridge: React.FC = () => {
  useRealtimeSync();
  return null;
};

describe('Reactive Chat Model Observation & Persisted Chat Threads', () => {
  const me = { id: 'u-me', username: 'me', name: 'Me', role: 'member' } as any;
  const chatA = {
    id: 'chat-a',
    participants: [
      { id: 'u-me', username: 'me', name: 'Me', icon_url: null },
      { id: 'u-ana', username: 'ana', name: 'Ana', icon_url: null },
    ],
    last_message: { id: 'm-a1', content: 'Hola Ana', sender_id: 'u-me', created_at: '2026-11-27T10:00:00Z' },
    unread_count: 0,
    updated_at: '2026-11-27T10:00:00Z',
  };
  const chatB = {
    id: 'chat-b',
    participants: [
      { id: 'u-me', username: 'me', name: 'Me', icon_url: null },
      { id: 'u-bob', username: 'bob', name: 'Bob', icon_url: null },
    ],
    last_message: { id: 'm-b1', content: 'Hola Bob', sender_id: 'u-bob', created_at: '2026-11-27T11:00:00Z' },
    unread_count: 0,
    updated_at: '2026-11-27T11:00:00Z',
  };

  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.restoreAllMocks();
    chatIdentityMap.clear();
    SocketClient.setActiveChat(null);
    useAuthStore.setState({ isAuthenticated: true, token: 'tok', user: me, isLoading: false });
    mockSocket = createMockSocket();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue(mockSocket as any);
  });

  it('reorders chats dynamically, updates previews/unread idempotently, and reflects typing in both ChatListItem and ChatThread from model', async () => {
    chatIdentityMap.ingestChats([chatA, chatB], Date.now());
    chatIdentityMap.ingestMessages('chat-a', [
      { id: 'm-a1', chat_id: 'chat-a', sender_id: 'u-me', sender: me, content: 'Hola Ana', created_at: '2026-11-27T10:00:00Z' },
    ], 'replace', Date.now(), true, false);
    chatIdentityMap.ingestMessages('chat-b', [
      { id: 'm-b1', chat_id: 'chat-b', sender_id: 'u-bob', sender: { id: 'u-bob', username: 'bob', name: 'Bob' }, content: 'Hola Bob', created_at: '2026-11-27T11:00:00Z' },
    ], 'replace', Date.now(), true, false);

    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/chats']}>
          <RealtimeBridge />
          <ChatsView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initially chat-b is newest so it renders first
    const getCardOrder = () =>
      Array.from(container.querySelectorAll('[data-chat-card-id]')).map((el) => el.getAttribute('data-chat-card-id'));
    expect(getCardOrder()).toEqual(['chat-b', 'chat-a']);

    // Receive realtime socket message on older chat-a (both new_chat_message and new-message for same ID)
    const incoming = {
      id: 'm-a2',
      chat_id: 'chat-a',
      sender_id: 'u-ana',
      sender: { id: 'u-ana', username: 'ana', name: 'Ana' },
      content: 'Mensaje en vivo!',
      created_at: '2026-11-27T12:00:00Z',
    };
    act(() => {
      mockSocket.trigger('new_chat_message', incoming);
      mockSocket.trigger('new-message', incoming);
    });

    // chat-a moves to top immediately, updates preview, and counts unread ONCE (1, not 2!)
    expect(getCardOrder()).toEqual(['chat-a', 'chat-b']);
    const cardA = container.querySelector('[data-chat-card-id="chat-a"]')!;
    expect(cardA).toHaveTextContent('Mensaje en vivo!');
    expect(cardA).toHaveTextContent('1');
    expect(chatIdentityMap.getMessages('chat-a')?.some((m) => m.id === 'm-a2')).toBe(true);

    // Open chat-b, then receive user-typing on BOTH chat-a (background) and chat-b (open)
    fireEvent.click(container.querySelector('[data-chat-card-id="chat-b"]')!);
    postSpy.mockClear();

    act(() => {
      mockSocket.trigger('user-typing', { chatId: 'chat-a', userId: 'u-ana', username: 'ana' });
      mockSocket.trigger('user-typing', { chatId: 'chat-b', userId: 'u-bob', username: 'bob' });
    });

    expect(container.querySelector('[data-chat-card-id="chat-a"]')).toHaveTextContent('ana está escribiendo...');
    expect(container.querySelector('[data-chat-card-id="chat-b"]')).toHaveTextContent('bob está escribiendo...');
    expect(container.querySelector('[data-chat-thread-id="chat-b"]')).toHaveTextContent('bob está escribiendo...');

    // user-stop-typing clears typing on chat-b
    act(() => {
      mockSocket.trigger('user-stop-typing', { chatId: 'chat-b', userId: 'u-bob' });
    });
    expect(container.querySelector('[data-chat-thread-id="chat-b"]')).not.toHaveTextContent('bob está escribiendo...');
  });

  it('keeps ChatThreadPane instances mounted with draft & scroll intact while observing background messages', () => {
    chatIdentityMap.ingestChats([chatA, chatB], Date.now());
    chatIdentityMap.ingestMessages('chat-a', [
      { id: 'm-a1', chat_id: 'chat-a', sender_id: 'u-me', sender: me, content: 'Inicial A', created_at: '2026-11-27T10:00:00Z' },
    ], 'replace', Date.now(), true, false);
    chatIdentityMap.ingestMessages('chat-b', [
      { id: 'm-b1', chat_id: 'chat-b', sender_id: 'u-bob', sender: { id: 'u-bob', username: 'bob', name: 'Bob' }, content: 'Inicial B', created_at: '2026-11-27T11:00:00Z' },
    ], 'replace', Date.now(), true, false);

    vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/chats']}>
          <RealtimeBridge />
          <ChatsView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Select chat-a and type draft text + simulate scrolled-up scrollTop
    fireEvent.click(container.querySelector('[data-chat-card-id="chat-a"]')!);
    const paneA = container.querySelector('[data-chat-thread-id="chat-a"]')!;
    const textareaA = paneA.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textareaA, { target: { value: 'borrador pendiente' } });

    const scrollBoxA = paneA.querySelector('.chat-scroll-container') as HTMLDivElement;
    let storedTopA = 140;
    Object.defineProperty(scrollBoxA, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(scrollBoxA, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(scrollBoxA, 'scrollTop', {
      configurable: true,
      get: () => storedTopA,
      set: (v: number) => { storedTopA = v; },
    });
    fireEvent.scroll(scrollBoxA);

    // Switch to chat-b
    fireEvent.click(container.querySelector('[data-chat-card-id="chat-b"]')!);
    expect(paneA.getAttribute('aria-hidden')).toBe('true');
    const paneB = container.querySelector('[data-chat-thread-id="chat-b"]')!;
    expect(paneB.getAttribute('aria-hidden')).toBe('false');
    expect(SocketClient.getActiveChatId()).toBe('chat-b');

    // Background message arrives in chat-a while hidden -> rendered inside persisted paneA without marking chat-a read!
    postSpy.mockClear();
    act(() => {
      mockSocket.trigger('new_chat_message', {
        id: 'm-a-bg',
        chat_id: 'chat-a',
        sender_id: 'u-ana',
        sender: { id: 'u-ana', username: 'ana', name: 'Ana' },
        content: 'Llegó en segundo plano',
        created_at: '2026-11-27T12:30:00Z',
      });
    });

    expect(paneA).toHaveTextContent('Llegó en segundo plano');
    expect(postSpy).not.toHaveBeenCalledWith('/chats/chat-a/read');

    // Switch back to chat-a -> exact DOM node, draft, and scrolled-up scrollTop preserved!
    fireEvent.click(container.querySelector('[data-chat-card-id="chat-a"]')!);
    expect(container.querySelector('[data-chat-thread-id="chat-a"]')).toBe(paneA);
    expect((paneA.querySelector('textarea') as HTMLTextAreaElement).value).toBe('borrador pendiente');
    expect(storedTopA).toBe(140);
    expect(postSpy).toHaveBeenCalledWith('/chats/chat-a/read');
  });

  it('switches immediately between already-read chats without snapping back or firing redundant /read requests', () => {
    chatIdentityMap.ingestChats([chatA, chatB], Date.now());
    chatIdentityMap.ingestMessages('chat-a', [
      { id: 'm-a1', chat_id: 'chat-a', sender_id: 'u-me', sender: me, content: 'A1', created_at: '2026-11-27T10:00:00Z' },
    ], 'replace', Date.now(), true, false);
    chatIdentityMap.ingestMessages('chat-b', [
      { id: 'm-b1', chat_id: 'chat-b', sender_id: 'u-bob', sender: { id: 'u-bob', username: 'bob', name: 'Bob' }, content: 'B1', created_at: '2026-11-27T11:00:00Z' },
    ], 'replace', Date.now(), true, false);

    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/chats?id=chat-a']}>
          <ChatsView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const isSelected = (id: string) =>
      container.querySelector(`[data-chat-card-id="${id}"]`)?.getAttribute('data-selected') === 'true';

    expect(isSelected('chat-a')).toBe(true);
    expect(isSelected('chat-b')).toBe(false);

    // Clear initial mount calls and rapidly switch chats multiple times
    getSpy.mockClear();
    postSpy.mockClear();

    fireEvent.click(container.querySelector('[data-chat-card-id="chat-b"]')!);
    expect(isSelected('chat-b')).toBe(true);
    expect(isSelected('chat-a')).toBe(false);
    expect(container.querySelector('[data-chat-thread-id="chat-b"]')?.getAttribute('aria-hidden')).toBe('false');

    fireEvent.click(container.querySelector('[data-chat-card-id="chat-a"]')!);
    expect(isSelected('chat-a')).toBe(true);
    expect(isSelected('chat-b')).toBe(false);

    fireEvent.click(container.querySelector('[data-chat-card-id="chat-b"]')!);
    expect(isSelected('chat-b')).toBe(true);
    expect(isSelected('chat-a')).toBe(false);

    // No redundant /read POSTs or /chats refetches when switching between already-read threads
    expect(postSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();

    // Mobile back-to-inbox clears selection cleanly without re-opening chat-b
    const backBtn = container.querySelector('[data-chat-thread-id="chat-b"] button[aria-label="Volver atrás"]')!;
    fireEvent.click(backBtn);
    expect(isSelected('chat-b')).toBe(false);
    expect(isSelected('chat-a')).toBe(false);
  });
});
