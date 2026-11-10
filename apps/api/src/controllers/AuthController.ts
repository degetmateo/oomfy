import { Request, Response, NextFunction } from 'express';
import { SignupService } from '../services/auth/SignupService.js';
import { VerifyService } from '../services/auth/VerifyService.js';
import { SigninService } from '../services/auth/SigninService.js';
import { TokenRefreshService } from '../services/auth/TokenRefreshService.js';
import { ForgotPasswordService } from '../services/auth/ForgotPasswordService.js';
import { ResetPasswordService } from '../services/auth/ResetPasswordService.js';
import { ForgotUsernameService } from '../services/auth/ForgotUsernameService.js';
import { PostgresSessionRepository } from '../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { ClientInfoParser } from '../infrastructure/adapters/ClientInfoParser.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthController {
  private static setRefreshCookie(res: Response, token: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: THIRTY_DAYS_MS, path: '/' });
  }

  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, ...(await SignupService.execute(req.body)) });
    } catch (err) { next(err); }
  }

  public static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.query.token as string) || req.body.token;
      const ip = ClientInfoParser.extractClientIp(req);
      const platform = ClientInfoParser.parseDevicePlatform(req.headers['user-agent']);
      const result = await VerifyService.execute(token, ip, platform);
      AuthController.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async signin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = ClientInfoParser.extractClientIp(req);
      const platform = ClientInfoParser.parseDevicePlatform(req.headers['user-agent']);
      const result = await SigninService.execute(req.body, ip, platform);
      AuthController.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      const result = await TokenRefreshService.execute(refreshToken);
      AuthController.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, accessToken: result.accessToken, refreshToken: result.refreshToken });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (refreshToken) await PostgresSessionRepository.deleteByToken(refreshToken).catch(() => {});
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refresh_token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.status(200).json({ success: true, message: 'Sesión cerrada con éxito.' });
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ForgotPasswordService.execute(req.body.username);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ResetPasswordService.execute(req.body.token, req.body.new_password);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async forgotUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ForgotUsernameService.execute(req.body.email);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
