import { Request, Response, NextFunction } from 'express';

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss: ws:",
  "frame-src 'self' https://open.spotify.com https://www.youtube.com https://youtube.com https://www.tiktok.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const APP_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': CSP_POLICY,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export class SecurityHeaders {
  public static apply(_req: Request, res: Response, next: NextFunction): void {
    for (const [key, value] of Object.entries(APP_SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.removeHeader('X-XSS-Protection');
    next();
  }
}
