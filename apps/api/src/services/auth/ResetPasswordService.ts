import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from './AuthSessionValidator.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { BadRequestError } from '../../errors/AppError.js';

export class ResetPasswordService {
  public static async execute(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || !newPassword || newPassword.length < 8) {
      throw new BadRequestError('Token inválido o la contraseña debe tener al menos 8 caracteres.');
    }

    const tokenHash = TokenService.hashToken(token);
    const pool = PostgresPool.getInstance();
    const client = await pool.connect();

    let userId = '';
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `DELETE FROM password_reset WHERE token = $1 AND expires_at > NOW() RETURNING user_id`,
        [tokenHash]
      );
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        throw new BadRequestError('El enlace de recuperación es inválido o ha expirado.');
      }

      userId = rows[0].user_id;
      const passwordHash = await PasswordHasher.hash(newPassword);
      await client.query(`UPDATE members SET password = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, userId]);
      await client.query(`DELETE FROM password_reset WHERE user_id = $1`, [userId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    await PostgresSessionRepository.revokeUserSessions(userId);
    AuthSessionValidator.revokeUserBefore(userId);
    SocketGateway.disconnectUser(userId);

    return { message: 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.' };
  }
}
