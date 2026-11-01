import { v7 as uuidv7 } from 'uuid';
import { SigninInput } from '@oomfy/shared';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { UnauthorizedError, ForbiddenError } from '../../errors/AppError.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';

export class SigninService {
  public static async execute(input: SigninInput, ip: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    const user = await PostgresUserRepository.findByUsernameOrEmail(input.username);
    if (!user) {
      throw new UnauthorizedError('Credenciales incorrectas.');
    }

    const isValid = await PasswordHasher.compare(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Credenciales incorrectas.');
    }

    if (user.status === 'pending') {
      throw new ForbiddenError('Debes activar tu cuenta antes de iniciar sesión. Revisa tu correo.');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Esta cuenta ha sido suspendida por incumplimiento de términos.');
    }

    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_signins && user.role !== 'admin') {
      throw new ForbiddenError('El inicio de sesión de usuarios está temporalmente deshabilitado por mantenimiento.');
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = TokenService.generateRefreshToken(tokenPayload);

    await PostgresSessionRepository.create({
      id: uuidv7(),
      user_id: user.id,
      ip,
      platform: input.platform || 'Web',
      token: refreshToken,
    });

    let publicProfile = await MongoMemberRepository.findById(user.id);
    if (!publicProfile) {
      await MongoMemberRepository.createOrUpdate({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      });
      publicProfile = await MongoMemberRepository.findById(user.id);
    }

    return {
      accessToken,
      refreshToken,
      user: { ...tokenPayload, ...publicProfile },
    };
  }
}

