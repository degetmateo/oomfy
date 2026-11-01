import { Request, Response, NextFunction } from 'express';
import { FollowService } from '../services/follows/FollowService.js';

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
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      const olderId = req.query.older_id as string | undefined;
      const currentUserId = req.user?.id;
      const followers = await FollowService.getFollowers(username, limit, offset, olderId, currentUserId);
      res.status(200).json({ success: true, data: followers });
    } catch (err) {
      next(err);
    }
  }

  public static async getFollowed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;
      const olderId = req.query.older_id as string | undefined;
      const currentUserId = req.user?.id;
      const followed = await FollowService.getFollowed(username, limit, offset, olderId, currentUserId);
      res.status(200).json({ success: true, data: followed });
    } catch (err) {
      next(err);
    }
  }
}
