import { Request, Response, NextFunction } from 'express';
import { SystemSettingsService } from '../services/admin/SystemSettingsService.js';
import { AdminUserService } from '../services/admin/AdminUserService.js';
import { AdminStatsService } from '../services/admin/AdminStatsService.js';
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

  public static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.query as string | undefined;
      const limit = Number(req.query.limit) || 30;
      const offset = Number(req.query.offset) || 0;
      const users = await AdminUserService.listUsers(query, limit, offset);
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  public static async setUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await AdminUserService.setUserStatus(id, status, req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async setUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const result = await AdminUserService.setUserRole(id, role, req.user!.id);
      res.status(200).json({ success: true, ...result });
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
}

