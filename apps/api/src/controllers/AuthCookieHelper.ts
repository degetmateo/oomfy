import { Request, Response } from 'express';
import { Environment } from '../config/Environment.js';
import { isOriginAllowed } from '../config/CorsPolicy.js';
import { ForbiddenError } from '../errors/AppError.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthCookieHelper {
  private static isOomfyHost(req?: Request): boolean {
    const rawHost = String(req?.headers?.host || req?.hostname || '').split(':')[0].toLowerCase();
    return !rawHost || rawHost === 'oomfy.online' || rawHost.endsWith('.oomfy.online');
  }

  public static getOptions(req?: Request, includeOomfyDomain = true) {
    const isProd = Environment.isProduction();
    const attachDomain = isProd && includeOomfyDomain && this.isOomfyHost(req);
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      ...(attachDomain ? { domain: '.oomfy.online' } : {}),
    };
  }

  public static setRefreshCookie(res: Response, token: string, req?: Request): void {
    res.cookie('refresh_token', token, { ...this.getOptions(req), maxAge: THIRTY_DAYS_MS });
  }

  public static clearRefreshCookie(res: Response, req?: Request): void {
    res.clearCookie('refresh_token', this.getOptions(req, false));
    if (Environment.isProduction()) {
      res.clearCookie('refresh_token', { ...this.getOptions(req, false), domain: '.oomfy.online' });
    }
  }

  public static assertAllowedCookieOrigin(req: Request): void {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      throw new ForbiddenError('Origen no autorizado para gestionar sesión.');
    }
    if (!origin && req.headers.referer) {
      try {
        const refOrigin = new URL(req.headers.referer).origin;
        if (!isOriginAllowed(refOrigin)) throw new ForbiddenError('Origen no autorizado para gestionar sesión.');
      } catch (err) {
        if (err instanceof ForbiddenError) throw err;
      }
    }
  }
}

