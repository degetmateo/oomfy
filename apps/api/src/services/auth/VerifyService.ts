import { v7 as uuidv7 } from 'uuid';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { TokenService } from '../../infrastructure/adapters/TokenService.js';
import { BadRequestError } from '../../errors/AppError.js';

export class VerifyService {
  public static async execute(token: string, ip: string, platform: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    const payload = TokenService.verifyAccessToken(token);
    const user = await PostgresUserRepository.findById(payload.id);

    if (!user) {
      throw new BadRequestError('Usuario no encontrado.');
    }

    if (user.status === 'pending') {
      await PostgresUserRepository.activateUser(user.id);
      await MongoMemberRepository.createOrUpdate({
        id: user.id,
        username: user.username,
        name: user.name,
      });
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
      platform,
      token: refreshToken,
    });

    const publicProfile = await MongoMemberRepository.findById(user.id);

    return {
      accessToken,
      refreshToken,
      user: { ...tokenPayload, ...publicProfile },
    };
  }
}

