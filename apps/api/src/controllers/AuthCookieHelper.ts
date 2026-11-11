import { Response } from 'express';
import { Environment } from '../config/Environment.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthCookieHelper {
  public static getOptions() {
    const isProd = Environment.isProduction();
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(isProd ? { domain: '.oomfy.online' } : {}),
    };
  }

  public static setRefreshCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, { ...this.getOptions(), maxAge: THIRTY_DAYS_MS });
  }

  public static clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', this.getOptions());
  }
}

