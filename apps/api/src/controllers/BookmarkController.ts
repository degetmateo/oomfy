import { Request, Response, NextFunction } from 'express';
import { BookmarkService } from '../services/bookmarks/BookmarkService.js';

export class BookmarkController {
  public static async listBookmarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BookmarkService.listBookmarks(req.user!.id, req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async saveBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publication_id, folder_id } = req.body;
      const entry = await BookmarkService.saveBookmark(req.user!.id, publication_id, folder_id);
      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      next(err);
    }
  }

  public static async removeBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BookmarkService.removeBookmark(req.user!.id, req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async moveBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await BookmarkService.moveBookmark(req.user!.id, req.params.id, req.body.folder_id ?? null);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async reorderBookmarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { folder_id, ordered_publication_ids } = req.body;
      await BookmarkService.reorderBookmarks(req.user!.id, folder_id ?? null, ordered_publication_ids);
      res.status(200).json({ success: true, message: 'Orden actualizado.' });
    } catch (err) {
      next(err);
    }
  }

  public static async listFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const folders = await BookmarkService.listFolders(req.user!.id);
      res.status(200).json({ success: true, data: folders });
    } catch (err) {
      next(err);
    }
  }

  public static async createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const folder = await BookmarkService.createFolder(req.user!.id, req.body.name);
      res.status(201).json({ success: true, data: folder });
    } catch (err) {
      next(err);
    }
  }

  public static async renameFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const folder = await BookmarkService.renameFolder(req.user!.id, req.params.id, req.body.name);
      res.status(200).json({ success: true, data: folder });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BookmarkService.deleteFolder(req.user!.id, req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
