import jwt from 'jsonwebtoken';
import { Environment } from '../../config/Environment.js';
import { UnauthorizedError } from '../../errors/AppError.js';

export interface TokenPayload {
  id: string; // UUID v7
  username: string;
  email: string;
  role: string;
  name?: string;
}

export class TokenService {
  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign({ data: payload }, Environment.JWT_SECRET, {
      expiresIn: '15m',
    });
  }

  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign({ data: payload }, Environment.JWT_REFRESH_SECRET, {
      expiresIn: '30d',
    });
  }

  public static generateVerificationToken(payload: TokenPayload): string {
    return jwt.sign({ data: payload }, Environment.JWT_SECRET, {
      expiresIn: '1h',
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, Environment.JWT_SECRET) as { data: TokenPayload };
      return decoded.data;
    } catch {
      throw new UnauthorizedError('Token de acceso inválido o expirado.');
    }
  }

  public static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, Environment.JWT_REFRESH_SECRET) as { data: TokenPayload };
      return decoded.data;
    } catch {
      throw new UnauthorizedError('Token de actualización inválido o expirado.');
    }
  }
}

