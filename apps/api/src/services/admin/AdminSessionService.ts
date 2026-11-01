import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';

export class AdminSessionService {
  public static async revokeAllSessions(preserveToken?: string): Promise<{ message: string; count: number }> {
    const count = await PostgresSessionRepository.revokeAllSessions(preserveToken);
    return {
      message: `Se cerraron exitosamente ${count} sesiones activas en la plataforma.`,
      count,
    };
  }

  public static async revokeUserSessions(userId: string): Promise<{ message: string; count: number }> {
    const count = await PostgresSessionRepository.revokeUserSessions(userId);
    return {
      message: `Se cerraron exitosamente ${count} sesiones activas del usuario.`,
      count,
    };
  }
}

