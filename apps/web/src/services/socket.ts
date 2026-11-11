import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/apiBase.js';
import { getAccessToken } from './sessionTokenMemory.js';

export class SocketClient {
  private static socket: Socket | null = null;

  public static getSocket(token?: string): Socket {
    if (!this.socket) {
      this.socket = io(getSocketBaseUrl(), {
        auth: { token: token || getAccessToken() },
        withCredentials: true,
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
