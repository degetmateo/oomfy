import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/users/ProfileService.js';

export class ProfileController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = req.params.username;
      const profile = await ProfileService.getProfile(username, req.user?.id);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const iconFile = files?.icon?.[0];
      const bannerFile = files?.banner?.[0];

      const updated = await ProfileService.updateProfile(req.user!.id, req.body, iconFile, bannerFile);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await ProfileService.getProfile(req.user!.username);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}

