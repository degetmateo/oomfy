import { Role } from '@oomfy/shared';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { CrossCollectionSyncRepository } from './CrossCollectionSyncRepository.js';

export interface UserProfileSyncInput {
  name?: string;
  icon_url?: string | null;
  banner_url?: string | null;
  role?: Role;
}

export class UserSyncService {
  private static idVariants(userId: string): any[] {
    const list: any[] = [userId];
    const mongoId = MongoIdHelper.toMongoId(userId);
    if (mongoId && mongoId !== userId) list.push(mongoId);
    return list;
  }

  public static async syncProfile(userId: string, username: string, input: UserProfileSyncInput): Promise<void> {
    const variants = this.idVariants(userId);
    const pubSet: Record<string, any> = {};
    const targetPubSet: Record<string, any> = {};
    const followerSet: Record<string, any> = {};
    const followedSet: Record<string, any> = {};
    const senderSet: Record<string, any> = {};

    if (input.name !== undefined && input.name.trim()) {
      pubSet['author.name'] = input.name.trim();
      targetPubSet['target_publication.author.name'] = input.name.trim();
      followerSet['follower.name'] = input.name.trim();
      followedSet['followed.name'] = input.name.trim();
      senderSet['sender.name'] = input.name.trim();
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

    if (Object.keys(pubSet).length === 0) return;

    await Promise.all([
      CrossCollectionSyncRepository.updatePublications(variants, username, pubSet, targetPubSet),
      CrossCollectionSyncRepository.updateFollows(variants, username, followerSet, followedSet),
      CrossCollectionSyncRepository.updateNotifications(variants, username, senderSet),
    ]);
  }

  public static async syncRole(userId: string, username: string, role: Role): Promise<void> {
    await this.syncProfile(userId, username, { role });
  }

  public static async syncUsername(userId: string, oldUsername: string, newUsername: string): Promise<void> {
    const variants = this.idVariants(userId);
    await Promise.all([
      CrossCollectionSyncRepository.updatePublications(
        variants,
        oldUsername,
        { 'author.username': newUsername },
        { 'target_publication.author.username': newUsername }
      ),
      CrossCollectionSyncRepository.updateFollows(
        variants,
        oldUsername,
        { 'follower.username': newUsername },
        { 'followed.username': newUsername }
      ),
      CrossCollectionSyncRepository.updateNotifications(variants, oldUsername, { 'sender.username': newUsername }),
    ]);
  }
}
