import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { UnauthorizedError } from '../../errors/AppError.js';

export class TokenRefreshService {
  public static async execute(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = TokenService.verifyRefreshToken(refreshToken);
    const user = await PostgresUserRepository.findById(payload.id);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Sesión expirada o usuario no válido.');
    }

    const newAccessToken = TokenService.generateAccessToken({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return { accessToken: newAccessToken };
  }
}

