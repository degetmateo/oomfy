import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';

export interface UserProfileSyncInput {
  name?: string;
  icon_url?: string | null;
  banner_url?: string | null;
}

export class UserSyncService {
  private static idVariants(userId: string): any[] {
    const list: any[] = [userId];
    const mongoId = MongoIdHelper.toMongoId(userId);
    if (mongoId && mongoId !== userId) list.push(mongoId);
    return list;
  }

  public static async syncProfile(userId: string, username: string, input: UserProfileSyncInput): Promise<void> {
    const db = MongoDatabase.getDb();
    const variants = this.idVariants(userId);

    const pubSet: Record<string, any> = {};
    const followerSet: Record<string, any> = {};
    const followedSet: Record<string, any> = {};
    const senderSet: Record<string, any> = {};

    if (input.name) {
      pubSet['author.name'] = input.name;
      followerSet['follower.name'] = input.name;
      followedSet['followed.name'] = input.name;
      senderSet['sender.name'] = input.name;
    }
    if (input.icon_url !== undefined) {
      pubSet['author.icon_url'] = input.icon_url;
      followerSet['follower.icon_url'] = input.icon_url;
      followedSet['followed.icon_url'] = input.icon_url;
      senderSet['sender.icon_url'] = input.icon_url;
    }
    if (input.banner_url !== undefined) {
      pubSet['author.banner_url'] = input.banner_url;
      followerSet['follower.banner_url'] = input.banner_url;
      followedSet['followed.banner_url'] = input.banner_url;
    }

    if (Object.keys(pubSet).length === 0) return;

    await Promise.all([
      db.collection('publications').updateMany(
        {
          $or: [
            { 'author.id': { $in: variants } },
            { 'author._id': { $in: variants } },
            { 'author.username': username },
          ],
        },
        { $set: pubSet }
      ),
      db.collection('follows').updateMany(
        {
          $or: [
            { follower_id: { $in: variants } },
            { 'follower.id': { $in: variants } },
            { 'follower._id': { $in: variants } },
            { 'follower.username': username },
          ],
        },
        { $set: followerSet }
      ),
      db.collection('follows').updateMany(
        {
          $or: [
            { followed_id: { $in: variants } },
            { 'followed.id': { $in: variants } },
            { 'followed._id': { $in: variants } },
            { 'followed.username': username },
          ],
        },
        { $set: followedSet }
      ),
      db.collection('notifications').updateMany(
        {
          $or: [
            { 'sender.id': { $in: variants } },
            { 'sender._id': { $in: variants } },
            { 'sender.username': username },
          ],
        },
        { $set: senderSet }
      ),
    ]);
  }

  public static async syncUsername(userId: string, oldUsername: string, newUsername: string): Promise<void> {
    const db = MongoDatabase.getDb();
    const variants = this.idVariants(userId);

    await Promise.all([
      db.collection('publications').updateMany(
        {
          $or: [
            { 'author.id': { $in: variants } },
            { 'author._id': { $in: variants } },
            { 'author.username': oldUsername },
          ],
        },
        { $set: { 'author.username': newUsername } }
      ),
      db.collection('follows').updateMany(
        {
          $or: [
            { follower_id: { $in: variants } },
            { 'follower.id': { $in: variants } },
            { 'follower._id': { $in: variants } },
            { 'follower.username': oldUsername },
          ],
        },
        { $set: { 'follower.username': newUsername } }
      ),
      db.collection('follows').updateMany(
        {
          $or: [
            { followed_id: { $in: variants } },
            { 'followed.id': { $in: variants } },
            { 'followed._id': { $in: variants } },
            { 'followed.username': oldUsername },
          ],
        },
        { $set: { 'followed.username': newUsername } }
      ),
      db.collection('notifications').updateMany(
        {
          $or: [
            { 'sender.id': { $in: variants } },
            { 'sender._id': { $in: variants } },
            { 'sender.username': oldUsername },
          ],
        },
        { $set: { 'sender.username': newUsername } }
      ),
    ]);
  }
}

