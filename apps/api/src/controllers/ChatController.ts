import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat/ChatService.js';
import { MessageService } from '../services/chat/MessageService.js';

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
      const { chat_id, content } = req.body;
      const sender = {
        id: req.user!.id,
        username: req.user!.username,
        name: req.user!.name || req.user!.username,
      };
      const message = await MessageService.sendMessage(chat_id, sender, content);
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }

  public static async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await MessageService.getChatMessages(req.params.id, req.user!.id);
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
}
