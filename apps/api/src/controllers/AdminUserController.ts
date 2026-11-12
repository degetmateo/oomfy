import { Request, Response, NextFunction } from 'express';
import { AdminUserService } from '../services/admin/AdminUserService.js';
import { AdminUserUpdateService } from '../services/admin/AdminUserUpdateService.js';
import { AdminSessionService } from '../services/admin/AdminSessionService.js';

export class AdminUserController {
  public static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await AdminUserService.listUsers(req.query as any);
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  public static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await AdminUserUpdateService.updateUser(id, req.user!.id, req.body);
      res.status(200).json({ success: true, ...result });
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

  public static async revokeUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AdminSessionService.revokeUserSessions(req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

