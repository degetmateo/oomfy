import { Request, Response, NextFunction } from 'express';
import { KlipyAdapter } from '../infrastructure/adapters/KlipyAdapter.js';
import { UrlPreviewAdapter } from '../infrastructure/adapters/UrlPreviewAdapter.js';
import { MongoMemberRepository } from '../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { SocketGateway } from '../socket/SocketGateway.js';

export class AuxController {
  public static async searchGifs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const limit = Number(req.query.limit) || 20;
      const gifs = await KlipyAdapter.search(q, limit);
      res.status(200).json({ success: true, data: gifs });
    } catch (err) {
      next(err);
    }
  }

  public static async getLinkPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ success: false, message: 'URL requerida.' });
        return;
      }
      const preview = await UrlPreviewAdapter.getPreview(url);
      res.status(200).json({ success: true, data: preview });
    } catch (err) {
      next(err);
    }
  }

  public static async getOnlineMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlineIds = SocketGateway.getOnlineUserIds();
      const members = [];
      const currentUserId = req.user?.id;
      for (const id of onlineIds.slice(0, 10)) {
        const m = await MongoMemberRepository.findById(id);
        if (m) {
          if (currentUserId) {
            m.is_following = await MongoFollowRepository.isFollowing(currentUserId, m.id);
          }
          members.push(m);
        }
      }
      res.status(200).json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }

  public static async getSuggestedMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 5;
      const members = await MongoMemberRepository.findSuggested(limit);
      const currentUserId = req.user?.id;

      if (currentUserId) {
        for (const m of members) {
          m.is_following = await MongoFollowRepository.isFollowing(currentUserId, m.id);
        }
      }

      res.status(200).json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }

  public static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const limit = Number(req.query.limit) || 20;
      const users = await MongoMemberRepository.search(q, limit);
      const currentUserId = req.user?.id;

      if (currentUserId) {
        for (const u of users) {
          u.is_following = await MongoFollowRepository.isFollowing(currentUserId, u.id);
        }
      }

      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
}
