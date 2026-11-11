import { v7 as uuidv7 } from 'uuid';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';
import { Environment } from '../../config/Environment.js';
import { escapeHtml } from '../../utils/HtmlEscapeHelper.js';

export class ForgotPasswordService {
  public static async execute(usernameOrEmail: string): Promise<{ message: string }> {
    const user = await PostgresUserRepository.findByUsernameOrEmail(usernameOrEmail.trim());
    if (user && user.status === 'active') {
      const rawToken = TokenService.generateOpaqueToken();
      const tokenHash = TokenService.hashToken(rawToken);
      const pool = PostgresPool.getInstance();
      await pool.query(`DELETE FROM password_reset WHERE user_id = $1 OR expires_at <= NOW()`, [user.id]);
      await pool.query(
        `INSERT INTO password_reset (id, user_id, token, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
        [uuidv7(), user.id, tokenHash]
      );

      const resetUrl = `${Environment.FRONTEND_URL}/reset-password?token=${rawToken}`;
      const safeName = escapeHtml(user.name);
      BackgroundTaskDispatcher.dispatch(`forgot-pass-${user.id}`, async () => {
        await ResendMailerAdapter.send({
          to: user.email,
          subject: 'Recupera tu contraseña en Oomfy',
          html: `
            <div style="font-family: monospace; background: #141414; color: #fff; padding: 20px; border: 2px solid #00dc65;">
              <h2 style="color: #00dc65;">Recuperación de Contraseña</h2>
              <p>Hola ${safeName}, recibimos una solicitud para restablecer la contraseña de tu cuenta en Oomfy.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #00dc65; color: #000; text-decoration: none; font-weight: bold;">RESTABLECER CONTRASEÑA</a>
              <p style="font-size: 11px; color: #888; margin-top: 15px;">Si no fuiste tú, puedes ignorar este correo. El enlace expira en 30 minutos.</p>
            </div>
          `,
        });
      });
    }
    return { message: 'Si los datos coinciden con una cuenta activa, recibirás un correo con instrucciones.' };
  }
}
