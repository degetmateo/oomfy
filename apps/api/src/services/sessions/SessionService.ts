import { Session } from '@oomfy/shared';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';

export class SessionService {
  public static async listUserSessions(userId: string): Promise<Session[]> {
    return PostgresSessionRepository.listByUser(userId);
  }

  public static async revokeSession(sessionId: string, userId: string): Promise<{ message: string }> {
    const deleted = await PostgresSessionRepository.deleteById(sessionId, userId);
    return { message: deleted ? 'Sesión revocada con éxito.' : 'Sesión no encontrada.' };
  }

  public static async revokeOtherSessions(
    userId: string,
    currentSessionId?: string,
    currentToken?: string
  ): Promise<{ message: string }> {
    await PostgresSessionRepository.deleteAllExceptCurrent(userId, currentSessionId, currentToken);
    return { message: 'Todas las demás sesiones fueron cerradas.' };
  }
}

