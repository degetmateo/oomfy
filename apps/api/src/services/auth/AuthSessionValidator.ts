import { TokenPayload, TokenService } from '../../infrastructure/adapters/TokenService.js';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { ForbiddenError, UnauthorizedError } from '../../errors/AppError.js';

export class AuthSessionValidator {
  private static suspendedUsers = new Set<string>();
  private static revokedSessions = new Set<string>();
  private static userRevokedBefore = new Map<string, { at: number; exceptSessionId?: string }>();

  public static suspendUser(userId: string): void {
    this.suspendedUsers.add(userId);
    this.revokeUserBefore(userId);
  }

  public static unsuspendUser(userId: string): void {
    this.suspendedUsers.delete(userId);
  }

  public static revokeSession(sessionId?: string): void {
    if (sessionId) this.revokedSessions.add(sessionId);
  }

  public static revokeUserBefore(userId: string, exceptSessionId?: string, timestampMs = TokenService.nextMonotonicMs()): void {
    const prev = this.userRevokedBefore.get(userId)?.at ?? 0;
    this.userRevokedBefore.set(userId, { at: Math.max(prev, timestampMs), exceptSessionId });
  }

  public static clearMemoryState(): void {
    this.suspendedUsers.clear();
    this.revokedSessions.clear();
    this.userRevokedBefore.clear();
  }

  public static async validate(payload: TokenPayload): Promise<TokenPayload> {
    if (this.suspendedUsers.has(payload.id)) {
      throw new ForbiddenError('Esta cuenta ha sido suspendida por incumplimiento de términos.');
    }

    if (payload.sessionId && this.revokedSessions.has(payload.sessionId)) {
      throw new UnauthorizedError('La sesión ha sido cerrada.');
    }

    const revoked = this.userRevokedBefore.get(payload.id);
    if (revoked !== undefined && (!payload.sessionId || payload.sessionId !== revoked.exceptSessionId)) {
      const issuedAtMs = payload.iatMs ?? (payload.iat ? payload.iat * 1000 : 0);
      if (issuedAtMs < revoked.at) {
        throw new UnauthorizedError('La sesión ha expirado por seguridad.');
      }
    }

    if (payload.sessionId) {
      const pool = PostgresPool.getInstance();
      const { rows } = await pool.query(
        `SELECT s.id, m.status, m.role
         FROM session s
         JOIN members m ON m.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2`,
        [payload.sessionId, payload.id]
      );

      if (rows.length === 0) {
        this.revokeSession(payload.sessionId);
        throw new UnauthorizedError('La sesión ha sido cerrada o ya no es válida.');
      }

      if (rows[0].status === 'suspended') {
        this.suspendUser(payload.id);
        throw new ForbiddenError('Esta cuenta ha sido suspendida por incumplimiento de términos.');
      }

      if (rows[0].status !== 'active') {
        throw new UnauthorizedError('La cuenta no se encuentra activa.');
      }

      return { ...payload, role: rows[0].role };
    }

    return payload;
  }
}
