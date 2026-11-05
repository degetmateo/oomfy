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

  public static async updateChatsAndMessages(
    variants: any[],
    username: string,
    userUpdates: { name?: string; icon_url?: string | null; username?: string }
  ): Promise<void> {
    const db = MongoDatabase.getDb();
    const chatUpdates = {};
    const msgUpdates = {};

    if (userUpdates.name) {
      chatUpdates['participants.$[elem].name'] = userUpdates.name;
      msgUpdates['sender.name'] = userUpdates.name;
    }
    if (userUpdates.icon_url !== undefined) {
      chatUpdates['participants.$[elem].icon_url'] = userUpdates.icon_url;
      msgUpdates['sender.icon_url'] = userUpdates.icon_url;
    }
    if (userUpdates.username) {
      chatUpdates['participants.$[elem].username'] = userUpdates.username;
      msgUpdates['sender.username'] = userUpdates.username;
    }

    const promises = [];
    if (Object.keys(chatUpdates).length > 0) {
      promises.push(
        db.collection('chats').updateMany(
          {
            $or: [
              { participant_ids: { $in: variants } },
              { 'participants.id': { $in: variants } },
              { 'participants.user_id': { $in: variants } },
              { 'participants.username': username },
            ],
          },
          { $set: chatUpdates },
          {
            arrayFilters: [
              {
                $or: [
                  { 'elem.id': { $in: variants } },
                  { 'elem.user_id': { $in: variants } },
                  { 'elem.username': username },
                ],
              },
            ],
          }
        )
      );
    }

    if (Object.keys(msgUpdates).length > 0) {
      promises.push(
        db.collection('messages').updateMany(
          {
            $or: [
              { sender_id: { $in: variants } },
              { 'sender.id': { $in: variants } },
              { 'sender._id': { $in: variants } },
              { 'sender.username': username },
            ],
          },
          { $set: msgUpdates }
        )
      );
    }

    await Promise.all(promises);
  }
}
