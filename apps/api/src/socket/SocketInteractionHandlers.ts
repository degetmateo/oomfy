import { Socket } from 'socket.io';
import { UpvoteService } from '../services/interactions/UpvoteService.js';
import { ShareService } from '../services/interactions/ShareService.js';
import { SocketGateway } from './SocketGateway.js';

export function registerInteractionSocketHandlers(
  socket: Socket,
  user: { id: string; username: string; name: string; role: string },
  isWithinQuota: (socket: Socket) => boolean
): void {
  socket.on('publication:upvote', async (d: { postId?: string; action?: 'add' | 'remove' }, ack?: (res: any) => void) => {
    try {
      if (!isWithinQuota(socket)) { ack?.({ success: false, message: 'Demasiadas peticiones.' }); return; }
      const postId = typeof d?.postId === 'string' ? d.postId.trim() : '';
      if (!postId || postId.length > 64) { ack?.({ success: false, message: 'ID inválido.' }); return; }
      const res = d?.action === 'remove'
        ? await UpvoteService.downvote(postId, user.id)
        : await UpvoteService.upvote(postId, user);
      ack?.({ success: true, ...res });
    } catch (err) {
      ack?.({ success: false, message: (err as Error).message });
    }
  });

  socket.on('publication:share', async (d: { postId?: string; action?: 'add' | 'remove' }, ack?: (res: any) => void) => {
    try {
      if (!isWithinQuota(socket)) { ack?.({ success: false, message: 'Demasiadas peticiones.' }); return; }
      const postId = typeof d?.postId === 'string' ? d.postId.trim() : '';
      if (!postId || postId.length > 64) { ack?.({ success: false, message: 'ID inválido.' }); return; }
      const res = d?.action === 'remove'
        ? await ShareService.unshare(postId, user.id)
        : await ShareService.share(postId, user);
      ack?.({ success: true, ...res });
    } catch (err) {
      ack?.({ success: false, message: (err as Error).message });
    }
  });
}

export function emitPublicationInteractionUpdate(data: { postId: string; upvotes_count?: number; shares_count?: number }): void {
  SocketGateway.broadcastPublicationInteraction(data);
}
