import { io, Socket } from 'socket.io-client';

export class SocketClient {
  private static socket: Socket | null = null;

  public static getSocket(token?: string): Socket {
    if (!this.socket) {
      const serverUrl =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('oomfy.online')
          ? 'https://api-oomfy.onrender.com'
          : undefined);

      this.socket = io(serverUrl || undefined, {
        auth: { token: token || localStorage.getItem('oomfy_token') },
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  public static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
