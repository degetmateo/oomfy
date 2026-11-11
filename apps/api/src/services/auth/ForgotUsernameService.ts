import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';
import { Environment } from '../../config/Environment.js';
import { escapeHtml } from '../../utils/HtmlEscapeHelper.js';

export class ForgotUsernameService {
  public static async execute(email: string): Promise<{ message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await PostgresUserRepository.findByUsernameOrEmail(cleanEmail);

    if (user && user.email.toLowerCase() === cleanEmail && user.status === 'active') {
      const signinUrl = `${Environment.FRONTEND_URL}/signin`;
      const safeName = escapeHtml(user.name);
      const safeUsername = escapeHtml(user.username);
      BackgroundTaskDispatcher.dispatch(`forgot-user-${user.id}`, async () => {
        await ResendMailerAdapter.send({
          to: user.email,
          subject: 'Recordatorio de usuario en Oomfy',
          html: `
            <div style="font-family: monospace; background: #141414; color: #fff; padding: 20px; border: 2px solid #00dc65;">
              <h2 style="color: #00dc65;">Recordatorio de Usuario</h2>
              <p>Hola ${safeName}, tu nombre de usuario en Oomfy es:</p>
              <div style="padding: 12px; background: #0d0d0d; border: 1px solid #00dc65; font-size: 18px; color: #00dc65; font-weight: bold;">@${safeUsername}</div>
              <a href="${signinUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #00dc65; color: #000; text-decoration: none; font-weight: bold;">INICIAR SESIÓN</a>
            </div>
          `,
        });
      });
    }

    return { message: 'Si existe una cuenta asociada a ese correo, recibirás tu nombre de usuario en breve.' };
  }
}
