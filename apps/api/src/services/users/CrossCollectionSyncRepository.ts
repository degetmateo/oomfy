import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';

export class CrossCollectionSyncRepository {
  public static async updatePublications(
    variants: any[],
    username: string,
    authorUpdates: Record<string, any>,
    targetAuthorUpdates?: Record<string, any>
  ): Promise<void> {
    const col = MongoDatabase.getDb().collection('publications');
    const promises: Promise<any>[] = [];

    if (Object.keys(authorUpdates).length > 0) {
      promises.push(
        col.updateMany(
          {
            $or: [
              { 'author.id': { $in: variants } },
              { 'author._id': { $in: variants } },
              { 'author.username': username },
            ],
          },
          { $set: authorUpdates }
        )
      );
    }

    if (targetAuthorUpdates && Object.keys(targetAuthorUpdates).length > 0) {
      promises.push(
        col.updateMany(
          {
            $or: [
              { 'target_publication.author.id': { $in: variants } },
              { 'target_publication.author._id': { $in: variants } },
              { 'target_publication.author.username': username },
            ],
          },
          { $set: targetAuthorUpdates }
        )
      );
    }

    await Promise.all(promises);
  }

  public static async updateFollows(
    variants: any[],
    username: string,
    followerSet: Record<string, any>,
    followedSet: Record<string, any>
  ): Promise<void> {
    const col = MongoDatabase.getDb().collection('follows');
    const promises: Promise<any>[] = [];

    if (Object.keys(followerSet).length > 0) {
      promises.push(
        col.updateMany(
          {
            $or: [
              { follower_id: { $in: variants } },
              { 'follower.id': { $in: variants } },
              { 'follower._id': { $in: variants } },
              { 'follower.username': username },
            ],
          },
          { $set: followerSet }
        )
      );
    }

    if (Object.keys(followedSet).length > 0) {
      promises.push(
        col.updateMany(
          {
            $or: [
              { followed_id: { $in: variants } },
              { 'followed.id': { $in: variants } },
              { 'followed._id': { $in: variants } },
              { 'followed.username': username },
            ],
          },
          { $set: followedSet }
        )
      );
    }

    await Promise.all(promises);
  }

  public static async updateNotifications(
    variants: any[],
    username: string,
    senderSet: Record<string, any>
  ): Promise<void> {
    if (Object.keys(senderSet).length === 0) return;
    const col = MongoDatabase.getDb().collection('notifications');
    await col.updateMany(
      {
        $or: [
          { 'sender.id': { $in: variants } },
          { 'sender._id': { $in: variants } },
          { 'sender.username': username },
        ],
      },
      { $set: senderSet }
    );
  }
}

