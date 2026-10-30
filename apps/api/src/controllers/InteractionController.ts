import { Request, Response, NextFunction } from 'express';
import { UpvoteService } from '../services/interactions/UpvoteService.js';
import { ShareService } from '../services/interactions/ShareService.js';

export class InteractionController {
  public static async upvote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicationId } = req.params;
      const user = req.user!;
      const result = await UpvoteService.upvote(publicationId, user as any);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async downvote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicationId } = req.params;
      const result = await UpvoteService.downvote(publicationId, req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async share(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicationId } = req.params;
      const user = req.user!;
      const result = await ShareService.share(publicationId, user as any);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async unshare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicationId } = req.params;
      const result = await ShareService.unshare(publicationId, req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
