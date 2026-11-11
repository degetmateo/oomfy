import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat/ChatService.js';
import { MessageService } from '../services/chat/MessageService.js';
import { ImgBBStorageAdapter } from '../infrastructure/adapters/ImgBBStorageAdapter.js';
import { BadRequestError } from '../errors/AppError.js';

export class ChatController {
  public static async getOrCreatePrivateChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const result = await ChatService.getOrCreatePrivateChat(
        { id: user.id, username: user.username, name: user.name || user.username },
        req.body.target_username
      );
      res.status(result.isNew ? 201 : 200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const files = (req.files as Express.Multer.File[]) || [];
      const { chat_id, content, reply_to_id, gif_url } = req.body;
      const uploadedUrls: string[] = Array.isArray(req.body.media_urls) ? [...req.body.media_urls] : [];

      for (const file of files.slice(0, 4)) {
        const upload = await ImgBBStorageAdapter.upload(file.buffer);
        if (upload.url) uploadedUrls.push(upload.url);
      }

      if (!content?.trim() && !gif_url && uploadedUrls.length === 0) {
        throw new BadRequestError('El mensaje no puede estar vacío.');
      }

      const msg = await MessageService.sendMessage(
        chat_id,
        { id: user.id, username: user.username, name: user.name || user.username, role: user.role },
        { content, reply_to_id: reply_to_id || null, gif_url: gif_url || null, media_urls: uploadedUrls.slice(0, 4) }
      );
      res.status(201).json({ success: true, data: msg });
    } catch (err) {
      next(err);
    }
  }

  public static async listChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await ChatService.listUserChats(req.user!.id) });
    } catch (err) { next(err); }
  }

  public static async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 30), 50);
      const olderId = req.query.older_id ? String(req.query.older_id) : undefined;
      const messages = await MessageService.getChatMessages(req.params.id, req.user!.id, limit, olderId);
      res.status(200).json({ success: true, data: messages });
    } catch (err) { next(err); }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, count: await MessageService.getUnreadCount(req.user!.id) });
    } catch (err) { next(err); }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await MessageService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Mensajes marcados como leídos.' });
    } catch (err) { next(err); }
  }

  public static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await MessageService.deleteMessage(req.params.id, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, message: 'Mensaje eliminado.' });
    } catch (err) { next(err); }
  }
}
