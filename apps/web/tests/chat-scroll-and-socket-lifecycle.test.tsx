import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatThread } from '../src/components/chat/ChatThread.js';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync.js';
import { chatIdentityMap } from '../src/models/ChatIdentityMap.js';
import { notificationIdentityMap } from '../src/models/NotificationIdentityMap.js';
import { SocketClient } from '../src/services/socket.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';

function createMockSocket() {
  const listeners = new Map<string, Set<Function>>();
  return {
    connected: true,
    on: (ev: string, fn: Function) => { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev)!.add(fn); },
    once: (ev: string, fn: Function) => { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev)!.add(fn); },
    off: (ev: string, fn: Function) => listeners.get(ev)?.delete(fn),
    emit: vi.fn(),
    connect: vi.fn(),
    trigger: (ev: string, data?: any) => listeners.get(ev)?.forEach((fn) => fn(data)),
  };
}

const SyncHarness: React.FC = () => { useRealtimeSync(); return null; };

describe('Chat Immediate Bottom Scroll & Socket Lifecycle Events', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    chatIdentityMap.clear();
    notificationIdentityMap.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'tok-1',
      user: { id: 'u-me', username: 'me', name: 'Me', role: 'member' } as any,
    });
  });

  it('positions cached ChatThread at bottom synchronously in useLayoutEffect without setTimeout flash', () => {
    const qc = new QueryClient();
    const sock = createMockSocket();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue(sock as any);
    vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);

    chatIdentityMap.ingestMessages('chat-imm-1', [
      { id: 'm1', chat_id: 'chat-imm-1', sender_id: 'u-2', sender: { id: 'u-2', username: 'bob', name: 'Bob' }, content: 'Hola 1', created_at: '2026-11-01T10:00:00Z' },
      { id: 'm2', chat_id: 'chat-imm-1', sender_id: 'u-me', sender: { id: 'u-me', username: 'me', name: 'Me' }, content: 'Hola 2', created_at: '2026-11-01T10:01:00Z' },
    ], 'replace', Date.now(), true, false);

    // Mock scrollHeight / clientHeight on prototype BEFORE mount to inspect synchronous scrollTop assignment
    const scrollTopSetter = vi.fn();
    const origScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    const origScrollTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 850 });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, get: () => 0, set: scrollTopSetter });

    try {
      const { container } = render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <ChatThread chat={{ id: 'chat-imm-1' }} currentUserId="u-me" />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(scrollTopSetter).toHaveBeenCalledWith(850);
      expect(container.querySelectorAll('.chat-bottom-anchor')).toHaveLength(1);
    } finally {
      if (origScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', origScrollHeight);
      if (origScrollTop) Object.defineProperty(HTMLElement.prototype, 'scrollTop', origScrollTop);
    }
  });

  it('emits client:leave / client:return lifecycle events and reconciles client:sync without double-counting', async () => {
    const sock = createMockSocket();
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue(sock as any);
    SocketClient.setActiveChat('chat-imm-1');

    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><SyncHarness /></QueryClientProvider>);

    // pageshow with persisted=false on initial load must NOT emit client:return
    act(() => {
      const bootEvt = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(bootEvt, 'persisted', { value: false });
      window.dispatchEvent(bootEvt);
    });
    expect(sock.emit).not.toHaveBeenCalledWith('client:return', expect.anything());

    // Tab becomes hidden -> emits client:leave
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(sock.emit).toHaveBeenCalledWith('client:leave', expect.objectContaining({ activeChatId: 'chat-imm-1' }));

    // Tab returns visible -> emits client:return
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(sock.emit).toHaveBeenCalledWith('client:return', expect.objectContaining({
      activeChatId: 'chat-imm-1',
      chatIds: expect.arrayContaining(['chat-imm-1']),
    })));

    // Receive client:sync -> sets exact pending count (1, not 2!) and ingests missed notifications & messages
    act(() => {
      sock.trigger('client:sync', {
        serverTime: Date.now(),
        unread_notifications_count: 1,
        unread_messages_count: 2,
        rejoined_chats: ['chat-imm-1'],
        missed_notifications: [{
          id: 'n-missed-1', recipient_id: 'u-me', type: 'follow', status: 'pending',
          target_publication_id: null, created_at: new Date().toISOString(),
          sender: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
        }],
        missed_messages: {
          'chat-imm-1': [{ id: 'm-missed', chat_id: 'chat-imm-1', sender_id: 'u2', sender: { id: 'u2', username: 'bob', name: 'Bob' }, content: 'Missed', created_at: new Date().toISOString(), status: 'sent' }],
        },
      });
    });

    expect(notificationIdentityMap.getPendingCount()).toBe(1);
    expect((qc.getQueryData(['notifications-unread-count']) as any).count).toBe(1);
    expect((qc.getQueryData(['unread-messages-count']) as any).count).toBe(2);
    expect(chatIdentityMap.getMessages('chat-imm-1')?.some((m) => m.id === 'm-missed')).toBe(true);
  });
});
