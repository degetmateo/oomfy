import { SocketClient } from '../services/socket.js';

export async function emitPublicationInteraction<T>(
  event: 'publication:upvote' | 'publication:share',
  payload: { postId: string; action: 'add' | 'remove' },
  httpFallback: () => Promise<T>
): Promise<T> {
  const socket = typeof SocketClient.isConnected === 'function' && SocketClient.isConnected() ? SocketClient.getSocket() : null;
  if (!socket || typeof socket.emit !== 'function') return httpFallback();

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      httpFallback().then(resolve, reject);
    }, 3000);

    socket.emit(event, payload, (res: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (res?.success) resolve(res as T);
      else reject(new Error(res?.message || 'Error al interactuar con la publicación.'));
    });
  });
}
