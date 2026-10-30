import { Resend } from 'resend';
import { Environment } from '../../config/Environment.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class ResendMailerAdapter {
  private static resendInstance: Resend | null = null;

  private static getClient(): Resend {
    if (!this.resendInstance) {
      this.resendInstance = new Resend(Environment.RESEND_API_KEY);
    }
    return this.resendInstance;
  }

  private static maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [user, domain] = parts;
    const maskedUser = user.length <= 2 ? `${user[0]}*` : `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user[user.length - 1]}`;
    return `${maskedUser}@${domain}`;
  }

  public static async send(options: SendEmailOptions): Promise<void> {
    const masked = this.maskEmail(options.to);
    if (!Environment.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY no configurada. Simulación de correo a:', masked);
      return;
    }

    try {
      const client = this.getClient();
      await client.emails.send({
        from: 'Oomfy <no-reply@oomfy.online>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✉️ Correo enviado exitosamente a: ${masked}`);
    } catch (error) {
      console.error('🟥 Error al enviar correo mediante Resend:', (error as Error).message);
      throw error;
    }
  }
}
