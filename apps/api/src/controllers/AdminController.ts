import { Request, Response, NextFunction } from 'express';
import { SystemSettingsService } from '../services/admin/SystemSettingsService.js';
import { AdminStatsService } from '../services/admin/AdminStatsService.js';
import { AdminSessionService } from '../services/admin/AdminSessionService.js';
import { DeletePublicationService } from '../services/publications/DeletePublicationService.js';

export class AdminController {
  public static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await SystemSettingsService.getSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await SystemSettingsService.updateSettings(req.body);
      res.status(200).json({ success: true, data: updated, message: 'Ajustes globales actualizados.' });
    } catch (err) {
      next(err);
    }
  }

  public static async deletePublication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DeletePublicationService.execute(id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminStatsService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preserveToken = req.cookies?.refresh_token || req.cookies?.access_token;
      const result = await AdminSessionService.revokeAllSessions(preserveToken, req.user?.sessionId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
