import { v7 as uuidv7 } from 'uuid';
import { PushPreferences } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { ProfileMediaService } from '../users/ProfileMediaService.js';
import { WebPushService } from './WebPushService.js';

export interface DispatchNotificationInput {
  recipientId: string;
  sender: { id: string; username: string; name: string; role: any; icon_url?: string | null };
  type: 'upvote' | 'share' | 'comment' | 'quote' | 'follow' | 'mention';
  targetPublicationId?: string | null;
  push: {
    title: string;
    body: string;
    url: string;
    category: keyof PushPreferences;
    icon?: string | null;
    image?: string | null;
  };
}

export class NotificationDispatcher {
  public static async dispatch(input: DispatchNotificationInput): Promise<void> {
    if (input.recipientId === input.sender.id) return;

    let iconUrl = input.push.icon || input.sender.icon_url || null;
    if ((!iconUrl || iconUrl.startsWith('/members/')) && input.sender.username) {
      const live = await ProfileMediaService.getUserIcon(input.sender.username).catch(() => null);
      if (live) iconUrl = live;
    }
    const finalIcon = iconUrl || '/assets/oomfy-logo-black-bg.png';

    const notif = {
      id: uuidv7(),
      recipient_id: input.recipientId,
      sender: {
        id: input.sender.id,
        username: input.sender.username,
        name: input.sender.name || input.sender.username,
        role: input.sender.role,
        icon_url: iconUrl || (input.sender.username ? `/members/${input.sender.username}/icon` : null),
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
      {
        title: input.push.title,
        body: input.push.body,
        url: input.push.url,
        icon: finalIcon,
        image: input.push.image || undefined,
        tag: `notif-${input.type}-${input.sender.id}`,
      },
      input.push.category
    ).catch(() => {});
  }
}

