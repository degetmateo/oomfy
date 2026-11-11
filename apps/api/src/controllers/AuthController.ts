import { Request, Response, NextFunction } from 'express';
import { SignupService } from '../services/auth/SignupService.js';
import { VerifyService } from '../services/auth/VerifyService.js';
import { SigninService } from '../services/auth/SigninService.js';
import { TokenRefreshService } from '../services/auth/TokenRefreshService.js';
import { ForgotPasswordService } from '../services/auth/ForgotPasswordService.js';
import { ForgotUsernameService } from '../services/auth/ForgotUsernameService.js';
import { ResetPasswordService } from '../services/auth/ResetPasswordService.js';
import { ClientInfoParser } from '../infrastructure/adapters/ClientInfoParser.js';
import { TokenService } from '../infrastructure/adapters/TokenService.js';
import { PostgresSessionRepository } from '../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { AuthSessionValidator } from '../services/auth/AuthSessionValidator.js';
import { SocketGateway } from '../socket/SocketGateway.js';
import { AuthCookieHelper } from './AuthCookieHelper.js';

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SignupService.execute(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  public static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = ClientInfoParser.extractClientIp(req);
      const platform = ClientInfoParser.parseDevicePlatform(req.headers['user-agent']);
      const result = await VerifyService.execute(req.body.token, ip, platform);
      AuthCookieHelper.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, accessToken: result.accessToken, user: result.user });
    } catch (err) { next(err); }
  }

  public static async signin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = ClientInfoParser.extractClientIp(req);
      const platform = ClientInfoParser.parseDevicePlatform(req.headers['user-agent']);
      const result = await SigninService.execute(req.body, ip, platform);
      AuthCookieHelper.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, accessToken: result.accessToken, user: result.user });
    } catch (err) { next(err); }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TokenRefreshService.execute(req.cookies?.refresh_token);
      AuthCookieHelper.setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ success: true, accessToken: result.accessToken });
    } catch (err) { next(err); }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token;
    const accessToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    try {
      if (accessToken) {
        const decoded = TokenService.verifyAccessToken(accessToken);
        if (decoded.sessionId) {
          AuthSessionValidator.revokeSession(decoded.sessionId);
          SocketGateway.disconnectSession(decoded.sessionId);
          await PostgresSessionRepository.deleteById(decoded.sessionId, decoded.id).catch(() => {});
        }
      }
    } catch {}
    try {
      if (refreshToken) {
        const sid = TokenService.verifyRefreshToken(refreshToken).sessionId;
        if (sid) { AuthSessionValidator.revokeSession(sid); SocketGateway.disconnectSession(sid); }
      }
    } catch {}
    if (refreshToken) await PostgresSessionRepository.deleteByToken(refreshToken).catch(() => {});
    AuthCookieHelper.clearRefreshCookie(res);
    res.status(200).json({ success: true, message: 'Sesión cerrada con éxito.' });
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, ...(await ForgotPasswordService.execute(req.body.username)) }); } catch (err) { next(err); }
  }
  public static async forgotUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, ...(await ForgotUsernameService.execute(req.body.email)) }); } catch (err) { next(err); }
  }
  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, ...(await ResetPasswordService.execute(req.body.token, req.body.new_password)) }); } catch (err) { next(err); }
  }
}
