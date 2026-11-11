import { Session } from '@oomfy/shared';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { AuthSessionValidator } from '../auth/AuthSessionValidator.js';

export class SessionService {
  public static async listUserSessions(userId: string): Promise<Session[]> {
    return PostgresSessionRepository.listByUser(userId);
  }

  public static async revokeSession(sessionId: string, userId: string): Promise<{ message: string }> {
    const deleted = await PostgresSessionRepository.deleteById(sessionId, userId);
    if (deleted) AuthSessionValidator.revokeSession(sessionId);
    return { message: deleted ? 'Sesión revocada con éxito.' : 'Sesión no encontrada.' };
  }

  public static async revokeOtherSessions(
    userId: string,
    currentSessionId?: string,
    currentToken?: string
  ): Promise<{ message: string }> {
    await PostgresSessionRepository.deleteAllExceptCurrent(userId, currentSessionId, currentToken);
    AuthSessionValidator.revokeUserBefore(userId, currentSessionId);
    return { message: 'Todas las demás sesiones fueron cerradas.' };
  }
}

