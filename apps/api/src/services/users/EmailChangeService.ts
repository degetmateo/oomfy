import { v7 as uuidv7 } from 'uuid';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { Environment } from '../../config/Environment.js';
import { escapeHtml } from '../../utils/HtmlEscapeHelper.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../errors/AppError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class EmailChangeService {
  public static async requestEmailChange(userId: string, newEmail: string, currentPassword: string): Promise<{ message: string }> {
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query('SELECT id, username, name, email, password FROM members WHERE id = $1', [userId]);
    if (rows.length === 0) throw new NotFoundError('Usuario no encontrado.');
    const user = rows[0];

    const isPasswordValid = await PasswordHasher.compare(currentPassword, user.password);
    if (!isPasswordValid) throw new UnauthorizedError('La contraseña actual es incorrecta.');

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) throw new BadRequestError('El correo electrónico ingresado no es válido.');
    if (cleanEmail === user.email.toLowerCase()) {
      throw new BadRequestError('El nuevo correo electrónico debe ser diferente al actual.');
    }

    const dup = await pool.query('SELECT 1 FROM members WHERE LOWER(email) = LOWER($1) AND id <> $2', [cleanEmail, userId]);
    if ((dup.rowCount ?? 0) > 0) throw new ConflictError('Ese correo electrónico ya está en uso por otra cuenta.');

    await pool.query('DELETE FROM email_change_token WHERE user_id = $1 AND used_at IS NULL', [userId]);
    const rawToken = TokenService.generateOpaqueToken();
    const tokenHash = TokenService.hashToken(rawToken);
    await pool.query(
      `INSERT INTO email_change_token (id, user_id, new_email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')`,
      [uuidv7(), userId, cleanEmail, tokenHash]
    );

    const verifyUrl = `${Environment.FRONTEND_URL}/verify?email_token=${rawToken}`;
    const safeName = escapeHtml(user.name);
    const safeEmail = escapeHtml(cleanEmail);
    try {
      await ResendMailerAdapter.send({
        to: cleanEmail,
        subject: 'Confirma tu nuevo correo electrónico en Oomfy',
        html: `<div style="font-family:monospace;background:#141414;color:#fff;padding:20px;border:2px solid #00dc65;"><h2 style="color:#00dc65;">Confirmación de correo</h2><p>Hola ${safeName}, solicitaste cambiar tu correo electrónico en Oomfy a <strong>${safeEmail}</strong>.</p><p>Haz clic en el siguiente botón para confirmar el cambio (válido por 1 hora):</p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#00dc65;color:#000;text-decoration:none;font-weight:bold;">CONFIRMAR CORREO</a><p style="font-size:11px;color:#888;margin-top:15px;">Si no fuiste tú, puedes ignorar este mensaje y tu correo actual se mantendrá intacto.</p></div>`,
      });
    } catch {
      await pool.query('DELETE FROM email_change_token WHERE token_hash = $1', [tokenHash]);
      throw new BadRequestError('No se pudo enviar el correo de verificación a esa dirección.');
    }

    return { message: 'Te enviamos un enlace de verificación a tu nuevo correo electrónico.' };
  }

  public static async confirmEmailChange(rawToken: string): Promise<{ message: string; email: string }> {
    const tokenHash = TokenService.hashToken(rawToken.trim());
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `UPDATE email_change_token SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id, new_email`,
      [tokenHash]
    );
    if (rows.length === 0) throw new BadRequestError('El enlace de confirmación es inválido o ha expirado.');

    const { user_id: userId, new_email: newEmail } = rows[0];
    const dup = await pool.query('SELECT 1 FROM members WHERE LOWER(email) = LOWER($1) AND id <> $2', [newEmail, userId]);
    if ((dup.rowCount ?? 0) > 0) throw new ConflictError('Ese correo electrónico ya está en uso por otra cuenta.');

    const updated = await pool.query('UPDATE members SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [newEmail, userId]);
    if ((updated.rowCount ?? 0) === 0) throw new NotFoundError('Usuario no encontrado.');

    await pool.query('DELETE FROM email_change_token WHERE user_id = $1', [userId]);
    return { message: 'Tu correo electrónico ha sido actualizado exitosamente.', email: newEmail };
  }
}
