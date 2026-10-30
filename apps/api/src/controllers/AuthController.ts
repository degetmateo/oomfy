import { Request, Response, NextFunction } from 'express';
import { SignupService } from '../services/auth/SignupService.js';
import { VerifyService } from '../services/auth/VerifyService.js';
import { SigninService } from '../services/auth/SigninService.js';
import { TokenRefreshService } from '../services/auth/TokenRefreshService.js';
import { ForgotPasswordService } from '../services/auth/ForgotPasswordService.js';
import { ResetPasswordService } from '../services/auth/ResetPasswordService.js';
import { ForgotUsernameService } from '../services/auth/ForgotUsernameService.js';

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SignupService.execute(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.query.token as string) || req.body.token;
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const platform = (req.headers['user-agent'] as string) || 'Web';

      const result = await VerifyService.execute(token, ip, platform);
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const { refreshToken: _discard, ...safePayload } = result;
      res.status(200).json({ success: true, ...safePayload });
    } catch (err) {
      next(err);
    }
  }

  public static async signin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await SigninService.execute(req.body, ip);

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const { refreshToken: _discard, ...safePayload } = result;
      res.status(200).json({ success: true, ...safePayload });
    } catch (err) {
      next(err);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
      const result = await TokenRefreshService.execute(refreshToken);
      res.status(200).json({ success: true, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('refresh_token');
    res.status(200).json({ success: true, message: 'Sesión cerrada con éxito.' });
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body;
      const result = await ForgotPasswordService.execute(username);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, new_password } = req.body;
      const result = await ResetPasswordService.execute(token, new_password);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async forgotUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await ForgotUsernameService.execute(email);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
