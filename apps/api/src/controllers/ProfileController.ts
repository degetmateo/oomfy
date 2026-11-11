import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/users/ProfileService.js';
import { AccountLifecycleService } from '../services/users/AccountLifecycleService.js';
import { isHttpUrl } from '../utils/UrlSecurityHelper.js';
import { AuthCookieHelper } from './AuthCookieHelper.js';

export class ProfileController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await ProfileService.getProfile(req.params.username, req.user?.id);
      res.status(200).json({ success: true, data: profile });
    } catch (err) { next(err); }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uploadedFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
      const updated = await ProfileService.updateProfile(req.user!.id, req.body, {
        icon: uploadedFiles?.icon?.[0],
        banner: uploadedFiles?.banner?.[0],
      });
      res.status(200).json({ success: true, message: 'Perfil actualizado con éxito.', data: updated });
    } catch (err) { next(err); }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await ProfileService.getProfile(req.user!.username, req.user!.id);
      res.status(200).json({ success: true, data: { ...req.user, ...profile } });
    } catch (err) { next(err); }
  }

  public static async getUserIcon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await ProfileService.getUserIcon(req.params.username);
      if (!url || !isHttpUrl(url)) {
        res.status(404).json({ success: false, message: 'Avatar no encontrado.' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.redirect(302, url);
    } catch (err) { next(err); }
  }

  public static async getUserBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await ProfileService.getUserBanner(req.params.username);
      if (!url || !isHttpUrl(url)) {
        res.status(404).json({ success: false, message: 'Banner no encontrado.' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.redirect(302, url);
    } catch (err) { next(err); }
  }

  public static async acceptTerms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await ProfileService.acceptTerms(req.user!.id);
      res.status(200).json({ success: true, message: 'Términos aceptados correctamente.', data: updated });
    } catch (err) { next(err); }
  }

  public static async exportMyData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const archive = await AccountLifecycleService.exportMyData(req.user!.id);
      res.setHeader('Content-Disposition', `attachment; filename="oomfy-export-${req.user!.username}.json"`);
      res.status(200).json({ success: true, data: archive });
    } catch (err) { next(err); }
  }

  public static async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AccountLifecycleService.deleteMyAccount(req.user!.id, req.body.password);
      AuthCookieHelper.clearRefreshCookie(res);
      res.status(200).json({ success: true, ...result });
    } catch (err) { next(err); }
  }
}
