import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { BadRequestError } from '../../errors/AppError.js';

export class ResetPasswordService {
  public static async execute(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || !newPassword || newPassword.length < 8) {
      throw new BadRequestError('Token inválido o la contraseña debe tener al menos 8 caracteres.');
    }

    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `SELECT user_id FROM password_reset WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      throw new BadRequestError('El enlace de recuperación es inválido o ha expirado.');
    }

    const userId = rows[0].user_id;
    const passwordHash = await PasswordHasher.hash(newPassword);

    await pool.query(
      `UPDATE oomfy SET password = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );

    await pool.query(`DELETE FROM password_reset WHERE user_id = $1`, [userId]);

    return { message: 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.' };
  }
}

