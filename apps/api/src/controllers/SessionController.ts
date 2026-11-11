import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessions/SessionService.js';

export class SessionController {
  public static async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentSessionId = req.user?.sessionId;
      const result = await SessionService.listUserSessions(req.user!.id, currentSessionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SessionService.revokeSession(req.params.id, req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentSessionId = req.user?.sessionId;
      const result = await SessionService.revokeOtherSessions(req.user!.id, currentSessionId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
