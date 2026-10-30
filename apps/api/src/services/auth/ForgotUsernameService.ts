import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';

export class ForgotUsernameService {
  public static async execute(email: string): Promise<{ message: string }> {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      return { message: 'Si el correo está registrado, se enviará un recordatorio.' };
    }

    const { rows } = await PostgresPool.getInstance().query(
      `SELECT username, name FROM oomfy WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );

    if (rows.length > 0) {
      const user = rows[0];
      await ResendMailerAdapter.send({
        to: cleanEmail,
        subject: 'Recordatorio de tu nombre de usuario en oomfy',
        html: `
          <h2>Hola ${user.name},</h2>
          <p>Has solicitado recordar tu nombre de usuario para tu cuenta en oomfy.</p>
          <p>Tu nombre de usuario es: <strong>@${user.username}</strong></p>
          <p>Ya puedes acceder a oomfy con tu nombre de usuario y tu contraseña habitual.</p>
        `,
      }).catch((err) => {
        console.error('Error enviando correo de recordatorio de usuario:', err);
      });
    }

    return { message: 'Si el correo electrónico está registrado, te hemos enviado tu nombre de usuario.' };
  }
}

