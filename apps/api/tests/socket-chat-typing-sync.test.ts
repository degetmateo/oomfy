import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSocketHandlers } from '../src/socket/SocketHandlers.js';
import { SocketGateway } from '../src/socket/SocketGateway.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';

describe('Socket Chat Typing & Multi-Device Sync', () => {
  let handlers: Record<string, Function>;
  let mockSocket: any;
  let userSockets: Map<string, Set<string>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    handlers = {};
    mockSocket = {
      id: 'sock-1',
      user: { id: 'user-sender', username: 'sender', sessionId: 'sess-1' },
      rooms: new Set(['chat:chat-123']),
      join: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      emit: vi.fn(),
      on: (ev: string, fn: Function) => { handlers[ev] = fn; },
    };
    userSockets = new Map();
    registerSocketHandlers(mockSocket, userSockets);
  });

  it('broadcasts user-typing to chat room and other participants user rooms', async () => {
    vi.spyOn(MongoChatRepository, 'getChatParticipants').mockResolvedValue(['user-sender', 'user-recipient']);
    const sendToUserSpy = vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    await handlers['typing-start']({ chatId: 'chat-123' });

    expect(mockSocket.to).toHaveBeenCalledWith('chat:chat-123');
    expect(sendToUserSpy).toHaveBeenCalledWith('user-recipient', 'user-typing', {
      chatId: 'chat-123', userId: 'user-sender', username: 'sender',
    });
  });

  it('broadcasts user-stop-typing to chat room and other participants user rooms', async () => {
    vi.spyOn(MongoChatRepository, 'getChatParticipants').mockResolvedValue(['user-sender', 'user-recipient']);
    const sendToUserSpy = vi.spyOn(SocketGateway, 'sendToUser').mockImplementation(() => {});

    await handlers['typing-stop']({ chatId: 'chat-123' });

    expect(mockSocket.to).toHaveBeenCalledWith('chat:chat-123');
    expect(sendToUserSpy).toHaveBeenCalledWith('user-recipient', 'user-stop-typing', {
      chatId: 'chat-123', userId: 'user-sender', username: 'sender',
    });
  });

  it('broadcasts delete-message to chat room and participant rooms', () => {
    const toSpy = vi.fn().mockReturnValue({ emit: vi.fn() });
    (SocketGateway as any).io = { to: toSpy } as any;

    SocketGateway.broadcastDeleteMessage('chat-123', 'msg-99', ['user-sender', 'user-recipient']);

    expect(toSpy).toHaveBeenCalledWith('chat:chat-123');
    expect(toSpy).toHaveBeenCalledWith('user:user-sender');
    expect(toSpy).toHaveBeenCalledWith('user:user-recipient');
  });
});
