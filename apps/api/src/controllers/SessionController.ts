import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessions/SessionService.js';

export class SessionController {
  public static async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await SessionService.listUserSessions(req.user!.id);
      res.status(200).json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;
      const result = await SessionService.revokeSession(sessionId, req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentSessionId = (req.query.current_id as string) || (req.body?.current_id as string) || '';
      const currentToken = req.cookies?.refresh_token;
      const result = await SessionService.revokeOtherSessions(req.user!.id, currentSessionId, currentToken);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
