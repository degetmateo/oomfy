import { v7 as uuidv7 } from 'uuid';
import { PushPreferences } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { WebPushService } from './WebPushService.js';

export interface DispatchNotificationInput {
  recipientId: string;
  sender: { id: string; username: string; name: string; role: any; icon_url?: string | null };
  type: 'upvote' | 'share' | 'comment' | 'quote' | 'follow';
  targetPublicationId?: string | null;
  push: {
    title: string;
    body: string;
    url: string;
    category: keyof PushPreferences;
  };
}

export class NotificationDispatcher {
  public static async dispatch(input: DispatchNotificationInput): Promise<void> {
    if (input.recipientId === input.sender.id) return;

    const notif = {
      id: uuidv7(),
      recipient_id: input.recipientId,
      sender: {
        id: input.sender.id,
        username: input.sender.username,
        name: input.sender.name || input.sender.username,
        role: input.sender.role,
        icon_url: input.sender.icon_url || `/members/${input.sender.username}/icon`,
        banner_url: null,
      },
      type: input.type as any,
      target_publication_id: input.targetPublicationId ?? null,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    await MongoNotificationRepository.create(notif);
    SocketGateway.sendNotification(input.recipientId, notif);
    WebPushService.sendPushToUser(
      input.recipientId,
      { title: input.push.title, body: input.push.body, url: input.push.url },
      input.push.category
    ).catch(() => {});
  }
}

