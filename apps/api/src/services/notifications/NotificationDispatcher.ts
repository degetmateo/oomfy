import { v7 as uuidv7 } from 'uuid';
import { Notification, Publication, PushPreferences } from '@oomfy/shared';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { NotificationIconHelper } from './NotificationIconHelper.js';
import { WebPushService } from './WebPushService.js';

export interface DispatchNotificationInput {
  recipientId: string;
  sender: { id: string; username: string; name: string; role: any; icon_url?: string | null };
  type: 'upvote' | 'share' | 'comment' | 'quote' | 'follow' | 'mention';
  targetPublicationId?: string | null;
  targetPublication?: Publication | null;
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

    const customPushIcon = input.push.icon && !input.push.icon.startsWith('/members/') && input.push.icon !== NotificationIconHelper.DEFAULT_APP_ICON
      ? input.push.icon
      : null;
    const finalIcon = customPushIcon || (await NotificationIconHelper.resolveSenderIcon(input.sender));

    const notif: Notification = {
      id: uuidv7(),
      recipient_id: input.recipientId,
      sender: {
        id: input.sender.id,
        username: input.sender.username,
        name: input.sender.name || input.sender.username,
        role: input.sender.role,
        icon_url: finalIcon !== NotificationIconHelper.DEFAULT_APP_ICON ? finalIcon : (input.sender.username ? `/members/${input.sender.username}/icon` : null),
        banner_url: null,
      },
      type: input.type,
      target_publication_id: input.targetPublicationId ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const isGroupable = (input.type === 'upvote' || input.type === 'share') && Boolean(input.targetPublicationId);
    let saved: Notification = notif;
    if (isGroupable) {
      const grouped = await MongoNotificationRepository.upsertGroupedInteraction(notif);
      saved = grouped.notification;
    } else {
      await MongoNotificationRepository.create(notif);
    }

    const actorsCount = Math.max(1, saved.actors_count || 1);
    let pushTitle = input.push.title;
    if (isGroupable && actorsCount > 1) {
      const others = actorsCount - 1;
      const actorName = saved.sender.name || saved.sender.username;
      pushTitle = input.type === 'upvote'
        ? `${actorName} y ${others} más indicaron que les gusta tu publicación`
        : `${actorName} y ${others} más compartieron tu publicación`;
    }

    const socketPayload = input.targetPublication ? { ...saved, target_publication: input.targetPublication } : saved;
    SocketGateway.sendNotification(input.recipientId, socketPayload);
    WebPushService.sendPushToUser(
      input.recipientId,
      {
        title: pushTitle,
        body: input.push.body,
        url: input.push.url,
        icon: finalIcon,
        image: input.push.image || undefined,
        tag: isGroupable ? `notif-${input.type}-${input.targetPublicationId}` : `notif-${input.type}-${input.sender.id}`,
      },
      input.push.category
    ).catch(() => {});
  }
}
