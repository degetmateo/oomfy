import { ChatMessage, Publication } from '@oomfy/shared';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { PublicationSnippetHelper } from './PublicationSnippetHelper.js';

export class MentionNotificationHelper {
  public static extractMentionedUsernames(content: string | null | undefined): string[] {
    if (!content) return [];
    const seen = new Set<string>();
    const regex = /(?<![a-zA-Z0-9_.])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      seen.add(match[1].toLowerCase());
      if (seen.size >= 10) break;
    }
    return Array.from(seen);
  }

  public static async notifyPublicationCreated(
    newPublication: Publication,
    targetPublication: Publication | null,
    pubType: string,
    user: { id: string; username: string; name: string; role: any }
  ): Promise<void> {
    const notifiedIds = new Set<string>([user.id]);
    const snippet = PublicationSnippetHelper.extractSnippet(newPublication);

    if (targetPublication) {
      notifiedIds.add(targetPublication.author.id);
      await NotificationDispatcher.dispatch({
        recipientId: targetPublication.author.id,
        sender: newPublication.author,
        type: pubType === 'quote' ? 'quote' : 'comment',
        targetPublicationId: newPublication.id,
        push: {
          title: pubType === 'quote' ? `${user.name} te citó` : `${user.name} te respondió`,
          body: snippet,
          url: `/publication/${newPublication.id}`,
          category: pubType === 'quote' ? 'quotes' : 'replies',
        },
      });
    }

    const usernames = this.extractMentionedUsernames(newPublication.content);
    for (const uname of usernames) {
      const mentioned = await MongoMemberRepository.findByUsername(uname);
      if (!mentioned || notifiedIds.has(mentioned.id)) continue;
      if (await MongoBlockRepository.isBlockedEitherWay(user.id, mentioned.id)) continue;
      notifiedIds.add(mentioned.id);
      await NotificationDispatcher.dispatch({
        recipientId: mentioned.id,
        sender: newPublication.author,
        type: 'mention',
        targetPublicationId: newPublication.id,
        push: {
          title: `${user.name} te mencionó`,
          body: snippet,
          url: `/publication/${newPublication.id}`,
          category: 'mentions',
        },
      });
    }
  }

  public static async notifyChatMentions(
    message: ChatMessage,
    participants: string[],
    sender: { id: string; username: string; name: string; role: any; icon_url?: string | null; banner_url?: null }
  ): Promise<void> {
    const usernames = this.extractMentionedUsernames(message.content);
    if (usernames.length === 0) return;

    const participantSet = new Set(participants.map(String));
    const body = message.content?.trim().slice(0, 140) || 'Te mencionó en un mensaje';

    for (const uname of usernames) {
      const mentioned = await MongoMemberRepository.findByUsername(uname);
      if (!mentioned || mentioned.id === sender.id || !participantSet.has(String(mentioned.id))) continue;
      if (await MongoBlockRepository.isBlockedEitherWay(sender.id, mentioned.id)) continue;
      await NotificationDispatcher.dispatch({
        recipientId: mentioned.id,
        sender,
        type: 'mention',
        targetPublicationId: null,
        push: {
          title: `${sender.name} te mencionó en un mensaje`,
          body,
          url: '/chats',
          category: 'mentions',
        },
      });
    }
  }
}
