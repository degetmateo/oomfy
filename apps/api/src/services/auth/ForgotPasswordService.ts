import { v7 as uuidv7 } from 'uuid';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { Environment } from '../../config/Environment.js';

export class ForgotPasswordService {
  public static async execute(username: string): Promise<{ message: string }> {
    const cleanUsername = username?.trim().toLowerCase();
    if (!cleanUsername) {
      return { message: 'Si el usuario existe, se enviará un enlace de recuperación.' };
    }

    const user = await PostgresUserRepository.findByUsernameOrEmail(cleanUsername);
    if (user && user.email) {
      const resetId = uuidv7();
      const token = uuidv7();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await PostgresPool.getInstance().query(
        `INSERT INTO password_reset (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
        [resetId, user.id, token, expiresAt]
      );

      const resetUrl = `${Environment.FRONTEND_URL}/reset-password?token=${token}`;
      await ResendMailerAdapter.send({
        to: user.email,
        subject: 'Restablece tu contraseña en oomfy',
        html: `
          <h2>Hola @${user.username},</h2>
          <p>Has solicitado restablecer tu contraseña en oomfy.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <p><a href="${resetUrl}" target="_blank">Restablecer mi contraseña</a></p>
          <p>Este enlace expirará en 1 hora. Si no fuiste tú, puedes ignorar este correo con tranquilidad.</p>
        `,
      }).catch((err) => {
        console.error('Error enviando correo de recuperación:', err);
      });
    }

    return { message: 'Si el nombre de usuario existe, te hemos enviado un correo con instrucciones.' };
  }
}

