import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notifications/NotificationService.js';

export class NotificationController {
  public static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const olderId = (req.query.older_id as string) || null;
      const result = await NotificationService.getNotifications(req.user!.id, limit, olderId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

