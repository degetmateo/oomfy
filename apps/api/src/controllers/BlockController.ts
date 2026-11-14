import { Request, Response, NextFunction } from 'express';
import { BlockService } from '../services/blocks/BlockService.js';

export class BlockController {
  public static async block(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BlockService.blockUser(req.user!.id, String(req.params.username));
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async unblock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BlockService.unblockUser(req.user!.id, String(req.params.username));
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
