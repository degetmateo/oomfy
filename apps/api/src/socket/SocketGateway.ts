import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Environment } from '../config/Environment.js';
import { TokenService } from '../infrastructure/adapters/TokenService.js';
import { MessageService } from '../services/chat/MessageService.js';

export class SocketGateway {
  private static io: Server | null = null;
  private static userSockets: Map<string, Set<string>> = new Map();

  public static initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Autenticación de socket requerida.'));
      try {
        const user = TokenService.verifyAccessToken(token);
        (socket as any).user = user;
        next();
      } catch {
        next(new Error('Token de socket inválido.'));
      }
    });

    this.io.on('connection', (socket: Socket) => this.handleConnection(socket));
    console.log('🟩 Servidor WebSocket inicializado con éxito.');
  }

  private static handleConnection(socket: Socket): void {
    const user = (socket as any).user;
    if (!user) return;

    socket.join(`user:${user.id}`);
    if (!this.userSockets.has(user.id)) this.userSockets.set(user.id, new Set());
    this.userSockets.get(user.id)!.add(socket.id);

    socket.on('join-chat', (chatId: string) => socket.join(`chat:${chatId}`));

    socket.on('send-message', async (data: { chatId: string; content: string }) => {
      try {
        if (!data.content?.trim()) return;
        await MessageService.sendMessage(data.chatId, user, data.content);
      } catch (err) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      this.userSockets.get(user.id)?.delete(socket.id);
      if (this.userSockets.get(user.id)?.size === 0) this.userSockets.delete(user.id);
    });
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

  public static getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

