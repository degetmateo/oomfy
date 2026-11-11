import { Request, Response, NextFunction } from 'express';
import { ClientInfoParser } from '../infrastructure/adapters/ClientInfoParser.js';

interface Bucket { count: number; resetAt: number }

export function createRateLimiter(options: { windowMs: number; max: number; prefix: string; enforceInTest?: boolean }) {
  const buckets = new Map<string, Bucket>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets.entries()) if (b.resetAt <= now) buckets.delete(k);
  }, Math.max(options.windowMs, 60_000));
  cleanup.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test' && !options.enforceInTest) return next();
    const ip = ClientInfoParser.extractClientIp(req);
    const key = `${options.prefix}:${ip}`;
    const now = Date.now();
    const existing = buckets.get(key);
    const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ success: false, statusCode: 429, message: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.' });
      return;
    }
    next();
  };
}

