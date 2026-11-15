import { Request, Response, NextFunction } from 'express';
import { EmoteService } from '../services/emotes/EmoteService.js';

export class EmoteController {
  public static async listEmotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const limit = Number(req.query.limit) || 100;
      const emotes = await EmoteService.listEmotes(q, limit);
      res.status(200).json({ success: true, data: emotes });
    } catch (err) {
      next(err);
    }
  }

  public static async createEmote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emote = await EmoteService.createEmote(
        { id: req.user!.id, username: req.user!.username },
        req.body.name,
        req.file
      );
      res.status(201).json({ success: true, message: 'Emote subido con éxito.', data: emote });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteEmote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EmoteService.deleteEmote(req.params.id, { id: req.user!.id, role: req.user!.role });
      res.status(200).json({ success: true, message: 'Emote eliminado con éxito.' });
    } catch (err) {
      next(err);
    }
  }
}
