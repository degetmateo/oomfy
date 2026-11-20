import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { Notification } from '@oomfy/shared';
import { useNotificationModel } from '../src/hooks/useNotificationModel.js';
import { NotificationController } from '../src/controllers/NotificationController.js';
import { notificationIdentityMap } from '../src/models/NotificationIdentityMap.js';
import { userIdentityMap } from '../src/models/UserIdentityMap.js';
import { publicationIdentityMap } from '../src/models/PublicationIdentityMap.js';
import { PublicationController } from '../src/controllers/PublicationController.js';
import { SocketClient } from '../src/services/socket.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Notification MVC, Real-Time Socket Notifications & Socket Interactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    notificationIdentityMap.clear();
    userIdentityMap.clear();
    publicationIdentityMap.clear();
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-me', username: 'me', name: 'Me', role: 'member' } as any });
  });

  it('updates observable NotificationModel on realtime socket push and syncs sender updates', () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useNotificationModel());
    const incoming: Notification = {
      id: 'notif-rt-1',
      recipient_id: 'u-me',
      sender: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'upvote',
      target_publication_id: 'pub-1',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    act(() => NotificationController.receiveRealtimeNotification(incoming, qc));
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.notifications[0].sender.name).toBe('Bob');

    act(() => userIdentityMap.patch('bob', (u) => ({ ...u, name: 'Bob Live' })));
    expect(result.current.notifications[0].sender.name).toBe('Bob Live');
  });

  it('dispatches upvote via connected SocketClient and applies realtime interaction updates', async () => {
    const qc = new QueryClient();
    publicationIdentityMap.ingest([{
      id: 'pub-live-1', author: { id: 'u2', username: 'bob', name: 'Bob', role: 'member', icon_url: null, banner_url: null },
      type: 'default', content: 'Hi', created_at: new Date().toISOString(),
      parent_publication_id: null, root_publication_id: null,
      upvotes_count: 1, shares_count: 0, quotes_count: 0, comments_count: 0, is_upvoted: false, is_shared: false,
    }]);

    vi.spyOn(SocketClient, 'isConnected').mockReturnValue(true);
    const emitMock = vi.fn((_ev: string, _payload: any, ack: (res: any) => void) => ack({ success: true, upvoted: true, upvotes_count: 2 }));
    vi.spyOn(SocketClient, 'getSocket').mockReturnValue({ emit: emitMock } as any);

    await PublicationController.toggleUpvote('pub-live-1', qc, vi.fn());
    expect(emitMock).toHaveBeenCalledWith('publication:upvote', { postId: 'pub-live-1', action: 'add' }, expect.any(Function));
    expect(publicationIdentityMap.get('pub-live-1')?.upvotes_count).toBe(2);

    PublicationController.applyRealtimeInteraction({ postId: 'pub-live-1', shares_count: 9 }, qc);
    expect(publicationIdentityMap.get('pub-live-1')?.shares_count).toBe(9);
  });
});
