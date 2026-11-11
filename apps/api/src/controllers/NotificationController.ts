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

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await NotificationService.getPendingCount(req.user!.id);
      res.status(200).json({ success: true, count });
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
      await WebPushService.saveSubscription(req.user!.id, req.body, req.body.previous_endpoint);
      res.status(200).json({ success: true, message: 'Suscripción push guardada.' });
    } catch (err) {
      next(err);
    }
  }

  public static async unsubscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await WebPushService.deactivateSubscription(req.body.endpoint, req.user?.id);
      res.status(200).json({ success: true, message: 'Suscripción push desactivada.' });
    } catch (err) {
      next(err);
    }
  }

  public static async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const endpoint = req.query.endpoint as string | undefined;
      const data = await WebPushService.getPreferences(req.user!.id, endpoint);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { endpoint, preferences } = req.body;
      const updated = await WebPushService.updatePreferences(req.user!.id, endpoint, preferences || {});
      res.status(200).json({ success: true, preferences: updated });
    } catch (err) {
      next(err);
    }
  }
}

