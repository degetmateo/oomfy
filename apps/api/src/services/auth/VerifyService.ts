import { v7 as uuidv7 } from 'uuid';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
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
    const tokenHash = TokenService.hashToken(token);
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `UPDATE verification_token
       SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [tokenHash]
    );

    if (rows.length === 0) {
      throw new BadRequestError('Token de verificación inválido, ya utilizado o expirado.');
    }

    const user = await PostgresUserRepository.findById(rows[0].user_id);
    if (!user || user.status !== 'pending') {
      throw new BadRequestError('La cuenta ya fue verificada o no puede activarse.');
    }

    await PostgresUserRepository.activateUser(user.id);
    await MongoMemberRepository.createOrUpdate({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      terms_accepted: Boolean(user.terms_accepted),
      terms_accepted_at: user.terms_accepted_at || null,
    });

    const sessionId = uuidv7();
    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = TokenService.generateRefreshToken(tokenPayload);

    await PostgresSessionRepository.create({
      id: sessionId,
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
