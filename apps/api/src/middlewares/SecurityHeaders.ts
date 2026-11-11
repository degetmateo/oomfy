import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { CSP_DIRECTIVES, SECURITY_HEADER_VALUES } from '@oomfy/shared';

const helmetMiddleware = helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'sameorigin' },
  contentSecurityPolicy: { useDefaults: false, directives: CSP_DIRECTIVES },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  xXssProtection: false,
});

export class SecurityHeaders {
  public static apply(req: Request, res: Response, next: NextFunction): void {
    helmetMiddleware(req, res, (err?: unknown) => {
      if (err) return next(err);
      res.setHeader('Permissions-Policy', SECURITY_HEADER_VALUES['Permissions-Policy']);
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');
      res.removeHeader('X-XSS-Protection');
      next();
    });
  }
}
