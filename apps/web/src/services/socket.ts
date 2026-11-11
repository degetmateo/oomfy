import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/apiBase';

export class SocketClient {
  private static socket: Socket | null = null;

  public static getSocket(token?: string): Socket {
    if (!this.socket) {
      this.socket = io(getSocketBaseUrl(), {
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
