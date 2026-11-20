import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/apiBase.js';
import { getAccessToken } from './sessionTokenMemory.js';

export class SocketClient {
  private static socket: Socket | null = null;

  public static getSocket(token?: string): Socket {
    const resolvedToken = token || getAccessToken();
    if (!this.socket) {
      this.socket = io(getSocketBaseUrl(), {
        auth: { token: resolvedToken },
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    } else if (resolvedToken && (this.socket.auth as { token?: string } | undefined)?.token !== resolvedToken) {
      this.socket.auth = { token: resolvedToken };
      if (!this.socket.connected) this.socket.connect();
    }
    return this.socket;
  }

  public static isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
