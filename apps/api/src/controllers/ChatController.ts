import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat/ChatService.js';
import { MessageService } from '../services/chat/MessageService.js';
import { ImgBBStorageAdapter } from '../infrastructure/adapters/ImgBBStorageAdapter.js';
import { BadRequestError } from '../errors/AppError.js';

export class ChatController {
  public static async listChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chats = await ChatService.listUserChats(req.user!.id);
      res.status(200).json({ success: true, data: chats });
    } catch (err) {
      next(err);
    }
  }

  public static async getOrCreatePrivateChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { target_username } = req.body;
      const result = await ChatService.getOrCreatePrivateChat(req.user!.id, target_username);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chat_id, content, reply_to_id, gif_url } = req.body;
      const files = (req.files as Express.Multer.File[]) || [];
      const mediaUrls: string[] = Array.isArray(req.body.media_urls) ? [...req.body.media_urls] : [];

      for (const file of files) {
        const upload = await ImgBBStorageAdapter.upload(file.buffer);
        mediaUrls.push(upload.url);
      }

      if (!content?.trim() && mediaUrls.length === 0 && !gif_url) {
        throw new BadRequestError('El mensaje no puede estar vacío.');
      }

      const sender = {
        id: req.user!.id,
        username: req.user!.username,
        name: req.user!.name || req.user!.username,
      };

      const message = await MessageService.sendMessage(chat_id, sender, {
        content,
        reply_to_id,
        gif_url,
        media_urls: mediaUrls,
      });

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }

  public static async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 30;
      const olderId = req.query.older_id as string | undefined;
      const messages = await MessageService.getChatMessages(req.params.id, req.user!.id, limit, olderId);
      res.status(200).json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await MessageService.getUnreadCount(req.user!.id);
      res.status(200).json({ success: true, count });
    } catch (err) {
      next(err);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await MessageService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Mensajes marcados como leídos.' });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await MessageService.deleteMessage(req.params.id);
      res.status(200).json({ success: true, message: 'Mensaje eliminado.' });
    } catch (err) {
      next(err);
    }
  }
}
