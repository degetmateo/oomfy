import { Role } from '@oomfy/shared';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';
import { CrossCollectionSyncRepository } from './CrossCollectionSyncRepository.js';
import { ChatAndAuxSyncRepository } from './ChatAndAuxSyncRepository.js';

export interface UserProfileSyncInput {
  name?: string;
  icon_url?: string | null;
  banner_url?: string | null;
  role?: Role;
}

export class UserSyncService {
  private static buildProfileSets(input: UserProfileSyncInput) {
    const pubSet: Record<string, any> = {};
    const targetPubSet: Record<string, any> = {};
    const followerSet: Record<string, any> = {};
    const followedSet: Record<string, any> = {};
    const senderSet: Record<string, any> = {};

    if (input.name !== undefined && input.name.trim()) {
      const cleanName = input.name.trim();
      pubSet['author.name'] = cleanName;
      targetPubSet['target_publication.author.name'] = cleanName;
      followerSet['follower.name'] = cleanName;
      followedSet['followed.name'] = cleanName;
      senderSet['sender.name'] = cleanName;
    }
    if (input.icon_url !== undefined) {
      pubSet['author.icon_url'] = input.icon_url;
      targetPubSet['target_publication.author.icon_url'] = input.icon_url;
      followerSet['follower.icon_url'] = input.icon_url;
      followedSet['followed.icon_url'] = input.icon_url;
      senderSet['sender.icon_url'] = input.icon_url;
    }
    if (input.banner_url !== undefined) {
      pubSet['author.banner_url'] = input.banner_url;
      targetPubSet['target_publication.author.banner_url'] = input.banner_url;
      followerSet['follower.banner_url'] = input.banner_url;
      followedSet['followed.banner_url'] = input.banner_url;
    }
    if (input.role !== undefined) {
      pubSet['author.role'] = input.role;
      targetPubSet['target_publication.author.role'] = input.role;
      senderSet['sender.role'] = input.role;
    }
    return { pubSet, targetPubSet, followerSet, followedSet, senderSet };
  }

  public static buildProfileSteps(userId: string, username: string, input: UserProfileSyncInput): Array<() => Promise<void>> {
    const variants = MongoIdHelper.idVariants(userId);
    const { pubSet, targetPubSet, followerSet, followedSet, senderSet } = this.buildProfileSets(input);
    if (Object.keys(pubSet).length === 0) return [];

    return [
      () => CrossCollectionSyncRepository.updatePublications(variants, username, pubSet, targetPubSet),
      () => ChatAndAuxSyncRepository.updateChatsAndMessages(variants, username, {
        name: input.name?.trim(), icon_url: input.icon_url, role: input.role,
      }),
      () => CrossCollectionSyncRepository.updateFollows(variants, username, followerSet, followedSet),
      () => CrossCollectionSyncRepository.updateNotifications(variants, username, senderSet),
    ];
  }

  public static async syncProfile(userId: string, username: string, input: UserProfileSyncInput): Promise<void> {
    for (const step of this.buildProfileSteps(userId, username, input)) await step();
  }

  public static enqueueProfileSync(userId: string, username: string, input: UserProfileSyncInput): void {
    const steps = this.buildProfileSteps(userId, username, input);
    if (steps.length > 0) BackgroundTaskDispatcher.enqueueSteps(`sync-profile-${userId}`, steps);
  }

  public static async syncRole(userId: string, username: string, role: Role): Promise<void> {
    await this.syncProfile(userId, username, { role });
  }

  public static buildUsernameSteps(userId: string, oldUsername: string, newUsername: string): Array<() => Promise<void>> {
    const variants = MongoIdHelper.idVariants(userId);
    return [
      () => CrossCollectionSyncRepository.updatePublications(variants, oldUsername, { 'author.username': newUsername }, { 'target_publication.author.username': newUsername }),
      () => ChatAndAuxSyncRepository.updateChatsAndMessages(variants, oldUsername, { username: newUsername }),
      () => CrossCollectionSyncRepository.updateFollows(variants, oldUsername, { 'follower.username': newUsername }, { 'followed.username': newUsername }),
      () => CrossCollectionSyncRepository.updateNotifications(variants, oldUsername, { 'sender.username': newUsername }),
      () => ChatAndAuxSyncRepository.updateAuxCollections(variants, oldUsername, newUsername),
    ];
  }

  public static async syncUsername(userId: string, oldUsername: string, newUsername: string): Promise<void> {
    for (const step of this.buildUsernameSteps(userId, oldUsername, newUsername)) await step();
  }

  public static enqueueUsernameSync(userId: string, oldUsername: string, newUsername: string): void {
    BackgroundTaskDispatcher.enqueueSteps(`sync-username-${userId}`, this.buildUsernameSteps(userId, oldUsername, newUsername));
  }
}
