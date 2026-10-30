import { Request, Response, NextFunction } from 'express';
import { CreatePublicationService } from '../services/publications/CreatePublicationService.js';
import { QueryPublicationService } from '../services/publications/QueryPublicationService.js';
import { DeletePublicationService } from '../services/publications/DeletePublicationService.js';

export class PublicationController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const user = req.user!;
      const post = await CreatePublicationService.execute(req.body, user as any, files);
      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }

  public static async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feed = await QueryPublicationService.getFeed(req.query as any, req.user?.id);
      res.status(200).json({ success: true, data: feed });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const result = await QueryPublicationService.getById(id, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const result = await DeletePublicationService.execute(id, req.user!);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

