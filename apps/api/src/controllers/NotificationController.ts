import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notifications/NotificationService.js';
import { WebPushService } from '../services/notifications/WebPushService.js';

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

  public static async getVapidPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publicKey = WebPushService.getPublicKey();
      res.status(200).json({ success: true, publicKey });
    } catch (err) {
      next(err);
    }
  }

  public static async subscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await WebPushService.saveSubscription(req.user!.id, req.body);
      res.status(200).json({ success: true, message: 'Suscripción push guardada.' });
    } catch (err) {
      next(err);
    }
  }

  public static async unsubscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await WebPushService.removeSubscription(req.user!.id, req.body.endpoint);
      res.status(200).json({ success: true, message: 'Suscripción push eliminada.' });
    } catch (err) {
      next(err);
    }
  }
}

