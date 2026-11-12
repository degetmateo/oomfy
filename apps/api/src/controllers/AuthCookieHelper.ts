import { Request, Response } from 'express';
import { Environment } from '../config/Environment.js';
import { isOriginAllowed } from '../config/CorsPolicy.js';
import { ForbiddenError } from '../errors/AppError.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthCookieHelper {
  public static getOptions(includeOomfyDomain = true) {
    const isProd = Environment.isProduction();
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      ...(isProd && includeOomfyDomain ? { domain: '.oomfy.online' } : {}),
    };
  }

  public static setRefreshCookie(res: Response, token: string, _req?: Request): void {
    res.cookie('refresh_token', token, { ...this.getOptions(true), maxAge: THIRTY_DAYS_MS });
    if (Environment.isProduction()) {
      res.clearCookie('refresh_token', this.getOptions(false));
    }
  }

  public static clearRefreshCookie(res: Response, _req?: Request): void {
    res.clearCookie('refresh_token', this.getOptions(true));
    if (Environment.isProduction()) {
      res.clearCookie('refresh_token', this.getOptions(false));
    }
  }

  public static extractRefreshCandidates(req: Request): string[] {
    const candidates: string[] = [];
    const add = (val?: unknown) => {
      if (typeof val === 'string' && val.trim() && !candidates.includes(val.trim())) candidates.push(val.trim());
    };
    add(req.body?.refreshToken);
    add(req.cookies?.refresh_token);
    const rawHeader = req.headers.cookie;
    if (typeof rawHeader === 'string' && rawHeader) {
      for (const part of rawHeader.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1 || part.slice(0, eq).trim() !== 'refresh_token') continue;
        try { add(decodeURIComponent(part.slice(eq + 1).trim())); } catch {}
      }
    }
    return candidates;
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

