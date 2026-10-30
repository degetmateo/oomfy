import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/users/SettingsService.js';

export class SettingsController {
  public static async updateUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body;
      const result = await SettingsService.updateUsername(req.user!.id, username);
      res.status(200).json({ success: true, message: 'Nombre de usuario actualizado con éxito.', data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { current_password, new_password } = req.body;
      await SettingsService.updatePassword(req.user!.id, current_password, new_password);
      res.status(200).json({ success: true, message: 'Contraseña actualizada con éxito.' });
    } catch (err) {
      next(err);
    }
  }
}

