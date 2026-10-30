import { Request, Response, NextFunction } from 'express';
import { FollowService } from '../services/follows/FollowService.js';
import { MongoFollowRepository } from '../infrastructure/repositories/mongo/MongoFollowRepository.js';

export class FollowController {
  public static async follow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const result = await FollowService.follow(req.user! as any, username);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async unfollow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const result = await FollowService.unfollow(req.user!.id, username);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getFollowers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const followers = await MongoFollowRepository.getFollowers(username);
      res.status(200).json({ success: true, data: followers });
    } catch (err) {
      next(err);
    }
  }

  public static async getFollowed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const followed = await MongoFollowRepository.getFollowed(username);
      res.status(200).json({ success: true, data: followed });
    } catch (err) {
      next(err);
    }
  }
}

