import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../infrastructure/adapters/TokenService.js';
import { AuthSessionValidator } from '../services/auth/AuthSessionValidator.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { Role } from '@oomfy/shared';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthGuard {
  private static extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return req.cookies?.access_token;
  }

  public static async requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = AuthGuard.extractToken(req);
    if (!token) {
      return next(new UnauthorizedError('Acceso no autorizado. Token requerido.'));
    }

    try {
      const payload = TokenService.verifyAccessToken(token);
      req.user = await AuthSessionValidator.validate(payload);
      next();
    } catch (err) {
      next(err);
    }
  }

  public static async optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = AuthGuard.extractToken(req);
    if (token) {
      try {
        const payload = TokenService.verifyAccessToken(token);
        req.user = await AuthSessionValidator.validate(payload);
      } catch {
      }
    }
    next();
  }

  public static requireRole(roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new UnauthorizedError('Autenticación requerida.'));
      }
      if (!roles.includes(req.user.role as Role)) {
        return next(new ForbiddenError('Permisos insuficientes para realizar esta acción.'));
      }
      next();
    };
  }
}

