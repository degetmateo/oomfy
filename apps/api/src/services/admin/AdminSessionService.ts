import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { AuthSessionValidator } from '../auth/AuthSessionValidator.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class AdminSessionService {
  public static async revokeAllSessions(preserveToken?: string, preserveSessionId?: string): Promise<{ message: string; count: number }> {
    const count = await PostgresSessionRepository.revokeAllSessions(preserveToken, preserveSessionId);
    AuthSessionValidator.clearMemoryState();
    SocketGateway.disconnectAllExcept(preserveSessionId);
    return {
      message: `Se cerraron exitosamente ${count} sesiones activas en la plataforma.`,
      count,
    };
  }

  public static async revokeUserSessions(userId: string): Promise<{ message: string; count: number }> {
    const count = await PostgresSessionRepository.revokeUserSessions(userId);
    AuthSessionValidator.revokeUserBefore(userId);
    SocketGateway.disconnectUser(userId);
    return {
      message: `Se cerraron exitosamente ${count} sesiones activas del usuario.`,
      count,
    };
  }
}
