import { v7 as uuidv7 } from 'uuid';
import { SignupInput } from '@oomfy/shared';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { ResendMailerAdapter } from '../../infrastructure/adapters/ResendMailerAdapter.js';
import { ConflictError, ForbiddenError } from '../../errors/AppError.js';
import { Environment } from '../../config/Environment.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';

export class SignupService {
  public static async execute(input: SignupInput): Promise<{ message: string; id: string }> {
    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_signups) {
      throw new ForbiddenError('El registro de nuevos usuarios está deshabilitado temporalmente.');
    }

    const existing = await PostgresUserRepository.findByUsernameOrEmail(input.username);
    if (existing) {
      if (existing.email === input.email.toLowerCase()) {
        throw new ConflictError('Ya existe una cuenta registrada con este correo electrónico.');
      }
      throw new ConflictError('El nombre de usuario ya está en uso.');
    }

    const passwordHash = await PasswordHasher.hash(input.password);
    const userId = uuidv7();

    const user = await PostgresUserRepository.create({
      id: userId,
      username: input.username,
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'member',
      status: 'pending',
    });

    // Sincronizar inmediatamente en MongoDB members para evitar inconsistencias
    await MongoMemberRepository.createOrUpdate({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
    });

    const verificationToken = TokenService.generateVerificationToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const verifyUrl = `${Environment.FRONTEND_URL}/verify?token=${verificationToken}`;
    await ResendMailerAdapter.send({
      to: user.email,
      subject: 'Verifica tu cuenta en Oomfy',
      html: `
        <h2>¡Bienvenido a Oomfy, ${user.name}!</h2>
        <p>Por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
        <p><a href="${verifyUrl}" target="_blank">Confirmar y Activar Cuenta</a></p>
        <p>Este enlace expirará en 1 hora. Si no solicitaste esta cuenta, ignora este mensaje.</p>
      `,
    });

    return { message: 'Cuenta creada con éxito. Por favor revisa tu correo electrónico.', id: user.id };
  }
}

