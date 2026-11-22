import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/apiBase.js';
import { getAccessToken } from './sessionTokenMemory.js';

const MAX_TRACKED_CHATS = 20;

export class SocketClient {
  private static socket: Socket | null = null;
  private static joinedChatIds = new Set<string>();
  private static activeChatId: string | null = null;

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

  public static trackChatRoom(chatId?: string | null): void {
    const trimmed = chatId?.trim();
    if (!trimmed) return;
    this.joinedChatIds.delete(trimmed);
    this.joinedChatIds.add(trimmed);
    while (this.joinedChatIds.size > MAX_TRACKED_CHATS) {
      const oldest = this.joinedChatIds.values().next().value;
      if (oldest === undefined) break;
      this.joinedChatIds.delete(oldest);
    }
  }

  public static setActiveChat(chatId: string | null): void {
    this.activeChatId = chatId?.trim() || null;
    if (this.activeChatId) this.trackChatRoom(this.activeChatId);
  }

  public static getActiveChatId(): string | null { return this.activeChatId; }
  public static getTrackedChatIds(): string[] { return Array.from(this.joinedChatIds); }
  public static isConnected(): boolean { return Boolean(this.socket?.connected); }

  public static disconnect(): void {
    this.joinedChatIds.clear();
    this.activeChatId = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
