import { Request, Response, NextFunction } from 'express';
import { PublicationPinService } from '../services/publications/PublicationPinService.js';
import { BadRequestError } from '../errors/AppError.js';

export class PublicationPinController {
  public static async pin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pubId = req.params.id || req.body.publication_id;
      if (!pubId) throw new BadRequestError('ID de publicación requerido.');
      const result = await PublicationPinService.pinPublication(req.user!.id, pubId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async unpin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PublicationPinService.unpinPublication(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

