import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../infrastructure/adapters/TokenService.js';
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
  public static requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return next(new UnauthorizedError('Acceso no autorizado. Token requerido.'));
    }

    try {
      const payload = TokenService.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (err) {
      next(err);
    }
  }

  public static optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.access_token;

    if (token) {
      try {
        req.user = TokenService.verifyAccessToken(token);
      } catch {
        // Ignorar token inválido para rutas opcionales
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

