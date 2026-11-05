import { Request, Response, NextFunction } from 'express';
import { WebPushService } from '../services/notifications/WebPushService.js';
import { MongoMemberRepository } from '../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';

export class AdminPushController {
  public static async sendPush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, body, url, target_username } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new BadRequestError('El título de la notificación es obligatorio.');
      }
      if (!body || typeof body !== 'string' || !body.trim()) {
        throw new BadRequestError('El contenido de la notificación es obligatorio.');
      }

      const payload = {
        title: title.trim(),
        body: body.trim(),
        url: url?.trim() || '/notifications',
      };

      if (target_username && typeof target_username === 'string' && target_username.trim()) {
        const cleanUsername = target_username.trim().replace(/^@/, '');
        const targetMember = await MongoMemberRepository.findByUsername(cleanUsername);
        if (!targetMember) {
          throw new NotFoundError(`No se encontró ningún usuario con el username @${cleanUsername}.`);
        }

        await WebPushService.sendPushToUser(targetMember.id, payload);
        res.status(200).json({
          success: true,
          message: `Notificación enviada con éxito a @${cleanUsername}.`,
          sent_count: 1,
        });
        return;
      }

      const result = await WebPushService.broadcastPush(payload);
      res.status(200).json({
        success: true,
        message: `Notificación enviada a ${result.sent} dispositivos activos (${result.failed} fallidos o caducados).`,
        sent_count: result.sent,
        failed_count: result.failed,
      });
    } catch (err) {
      next(err);
    }
  }
}

