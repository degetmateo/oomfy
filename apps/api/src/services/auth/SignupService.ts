import { v7 as uuidv7 } from 'uuid';
import { SignupInput } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';
import { Environment } from '../../config/Environment.js';
import { escapeHtml } from '../../utils/HtmlEscapeHelper.js';
import { ConflictError, ForbiddenError } from '../../errors/AppError.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';

export class SignupService {
  public static async execute(input: SignupInput): Promise<{ message: string; userId: string }> {
    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_signups) {
      throw new ForbiddenError('El registro de nuevos usuarios está deshabilitado temporalmente.');
    }

    const existingUsername = await PostgresUserRepository.findByUsernameOrEmail(input.username);
    if (existingUsername) {
      throw new ConflictError('El nombre de usuario ya está en uso.');
    }

    const existingEmail = await PostgresUserRepository.findByUsernameOrEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('El correo electrónico ya está registrado.');
    }

    const userId = uuidv7();
    const passwordHash = await PasswordHasher.hash(input.password);
    const user = await PostgresUserRepository.create({
      id: userId,
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      acceptedTerms: true,
    });

    const rawToken = TokenService.generateOpaqueToken();
    const tokenHash = TokenService.hashToken(rawToken);
    const pool = PostgresPool.getInstance();
    await pool.query(
      `INSERT INTO verification_token (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
      [uuidv7(), user.id, tokenHash]
    );

    const verifyUrl = `${Environment.FRONTEND_URL}/verify?token=${rawToken}`;
    const safeName = escapeHtml(user.name);
    BackgroundTaskDispatcher.dispatch(`signup-verify-${user.id}`, async () => {
      await ResendMailerAdapter.send({
        to: user.email,
        subject: 'Verifica tu cuenta en Oomfy',
        html: `
          <div style="font-family: monospace; background: #141414; color: #fff; padding: 20px; border: 2px solid #00dc65;">
            <h1 style="color: #00dc65;">¡Bienvenido a Oomfy, ${safeName}!</h1>
            <p>Haz clic en el siguiente botón para activar tu cuenta (válido por 24 horas):</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #00dc65; color: #000; text-decoration: none; font-weight: bold;">ACTIVAR CUENTA</a>
          </div>
        `,
      });
    });

    return {
      message: 'Cuenta creada con éxito. Revisa tu correo electrónico para activarla.',
      userId: user.id,
    };
  }
}
