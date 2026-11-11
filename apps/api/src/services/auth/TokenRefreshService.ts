import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { UnauthorizedError } from '../../errors/AppError.js';
import { AuthSessionValidator } from './AuthSessionValidator.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class TokenRefreshService {
  public static async executeAny(candidates: string[]): Promise<{ accessToken: string; refreshToken: string }> {
    if (candidates.length === 0) return this.execute('');
    let lastErr: unknown;
    for (const candidate of candidates) {
      try {
        return await this.execute(candidate);
      } catch (err) {
        lastErr = err;
        if ((err as Error)?.message?.includes('por seguridad')) throw err;
      }
    }
    throw lastErr;
  }

  public static async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedError('Token de actualización requerido.');
    }

    const payload = TokenService.verifyRefreshToken(refreshToken);
    const session = await PostgresSessionRepository.findByToken(refreshToken);

    if (!session) {
      throw new UnauthorizedError('La sesión ha sido cerrada o ya no es válida.');
    }

    if (session.reused) {
      AuthSessionValidator.revokeSession(session.id);
      SocketGateway.disconnectSession(session.id);
      await PostgresSessionRepository.deleteById(session.id, session.user_id).catch(() => {});
      throw new UnauthorizedError('La sesión ha sido cerrada por seguridad.');
    }

    const user = await PostgresUserRepository.findById(session.user_id || payload.id);

    if (!user || user.status !== 'active') {
      if (user?.status === 'suspended') AuthSessionValidator.suspendUser(user.id);
      AuthSessionValidator.revokeSession(session.id);
      SocketGateway.disconnectSession(session.id);
      await PostgresSessionRepository.deleteById(session.id, session.user_id).catch(() => {});
      throw new UnauthorizedError('Sesión expirada o usuario no válido.');
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };

    const newAccessToken = TokenService.generateAccessToken(tokenPayload);
    const newRefreshToken = TokenService.generateRefreshToken(tokenPayload);

    await PostgresSessionRepository.updateToken(
      session.id,
      newRefreshToken,
      session.rotatedFromPrevious ? undefined : refreshToken
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
