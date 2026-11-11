import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SECURITY_HEADER_VALUES } from '@oomfy/shared';
import { corsOriginHandler } from '../config/CorsPolicy.js';
import { TokenService } from '../infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../services/auth/AuthSessionValidator.js';
import { registerSocketHandlers } from './SocketHandlers.js';

export class SocketGateway {
  private static io: Server | null = null;
  private static userSockets = new Map<string, Set<string>>();

  public static initialize(server: HttpServer): void {
    this.io = new Server(server, { cors: { origin: corsOriginHandler, credentials: true } });
    (this.io as any).engine?.on('headers', (headers: Record<string, any>) => {
      Object.assign(headers, SECURITY_HEADER_VALUES);
    });
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Autenticación de socket requerida.'));
      try {
        (socket as any).user = await AuthSessionValidator.validate(TokenService.verifyAccessToken(token));
        next();
      } catch (err) {
        next(err instanceof Error ? err : new Error('Token de socket inválido.'));
      }
    });
    this.io.on('connection', (socket: Socket) => registerSocketHandlers(socket, this.userSockets));
  }

  public static disconnectUser(userId: string): void {
    this.io?.in(`user:${userId}`).disconnectSockets(true);
    this.userSockets.delete(userId);
  }
  public static disconnectSession(sessionId: string): void {
    this.io?.in(`session:${sessionId}`).disconnectSockets(true);
  }
  public static disconnectAllExcept(preserveSessionId?: string): void {
    if (!this.io) return;
    for (const [, sock] of this.io.sockets.sockets) {
      if (!preserveSessionId || (sock as any).user?.sessionId !== preserveSessionId) sock.disconnect(true);
    }
  }
  public static sendNotification(userId: string, notification: any): void {
    this.io?.to(`user:${userId}`).emit('notification', notification);
  }
  public static sendToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data);
  }
  public static broadcastChatMessage(chatId: string, message: any): void {
    this.io?.to(`chat:${chatId}`).emit('new-message', message);
  }
  public static broadcastDeleteMessage(chatId: string, messageId: string): void {
    this.io?.to(`chat:${chatId}`).emit('delete-message', { chatId, messageId });
  }
  public static getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
  public static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
