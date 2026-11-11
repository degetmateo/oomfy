import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v7 as uuidv7 } from 'uuid';
import { Environment } from '../../config/Environment.js';
import { UnauthorizedError } from '../../errors/AppError.js';

export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  name?: string;
  sessionId?: string;
  iat?: number;
  iatMs?: number;
}

export class TokenService {
  private static lastClockMs = 0;

  public static nextMonotonicMs(): number {
    const now = Date.now();
    this.lastClockMs = now > this.lastClockMs ? now : this.lastClockMs + 1;
    return this.lastClockMs;
  }

  public static generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  public static generateAccessToken(payload: TokenPayload): string {
    const iatMs = this.nextMonotonicMs();
    return jwt.sign({ data: { ...payload, iatMs }, tokenType: 'access', jti: uuidv7() }, Environment.JWT_SECRET, {
      expiresIn: '15m',
    });
  }

  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign({ data: payload, tokenType: 'refresh', jti: uuidv7() }, Environment.JWT_REFRESH_SECRET, {
      expiresIn: '30d',
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, Environment.JWT_SECRET) as { data: TokenPayload; tokenType?: string; iat?: number };
      if (decoded.tokenType !== 'access') throw new Error('Invalid tokenType');
      return { ...decoded.data, iat: decoded.iat };
    } catch {
      throw new UnauthorizedError('Token de acceso inválido o expirado.');
    }
  }

  public static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, Environment.JWT_REFRESH_SECRET) as { data: TokenPayload; tokenType?: string };
      if (decoded.tokenType !== 'refresh') throw new Error('Invalid tokenType');
      return decoded.data;
    } catch {
      throw new UnauthorizedError('Token de actualización inválido o expirado.');
    }
  }
}
