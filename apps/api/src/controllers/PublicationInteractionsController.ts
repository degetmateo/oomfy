import { Request, Response, NextFunction } from 'express';
import { InteractionQueryService } from '../services/interactions/InteractionQueryService.js';

export class PublicationInteractionsController {
  public static async getLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pubId = req.params.id || req.params.publicationId;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      const users = await InteractionQueryService.getLikes(pubId, limit, offset, req.user?.id);
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  public static async getShares(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pubId = req.params.id || req.params.publicationId;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      const users = await InteractionQueryService.getShares(pubId, limit, offset, req.user?.id);
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  public static async getQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pubId = req.params.id || req.params.publicationId;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      const olderId = req.query.older_id ? String(req.query.older_id) : undefined;
      const quotes = await InteractionQueryService.getQuotes(pubId, limit, offset, olderId, req.user?.id);
      res.status(200).json({ success: true, data: quotes });
    } catch (err) {
      next(err);
    }
  }
}

