import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';

export class ChatAndAuxSyncRepository {
  public static async updateChatsAndMessages(
    variants: any[],
    username: string,
    userUpdates: { name?: string; icon_url?: string | null; username?: string; role?: string }
  ): Promise<void> {
    const db = MongoDatabase.getDb();
    const chatUpdates: Record<string, any> = {};
    const msgUpdates: Record<string, any> = {};
    const replyUpdates: Record<string, any> = {};

    if (userUpdates.name) {
      chatUpdates['participants.$[elem].name'] = userUpdates.name;
      msgUpdates['sender.name'] = userUpdates.name;
      replyUpdates['reply_to.sender_name'] = userUpdates.name;
    }
    if (userUpdates.icon_url !== undefined) {
      chatUpdates['participants.$[elem].icon_url'] = userUpdates.icon_url;
      msgUpdates['sender.icon_url'] = userUpdates.icon_url;
    }
    if (userUpdates.username) {
      chatUpdates['participants.$[elem].username'] = userUpdates.username;
      msgUpdates['sender.username'] = userUpdates.username;
      replyUpdates['reply_to.sender_username'] = userUpdates.username;
    }
    if (userUpdates.role) {
      msgUpdates['sender.role'] = userUpdates.role;
    }

    const promises: Promise<any>[] = [];
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
      promises.push(db.collection('messages').updateMany(
        { $or: [{ sender_id: { $in: variants } }, { 'sender.id': { $in: variants } }, { 'sender._id': { $in: variants } }, { 'sender.username': username }] },
        { $set: msgUpdates }
      ));
    }

    if (Object.keys(replyUpdates).length > 0) {
      promises.push(
        db.collection('messages').updateMany({ 'reply_to.sender_username': username }, { $set: replyUpdates })
      );
    }

    await Promise.all(promises);
  }

  public static async updateAuxCollections(variants: any[], oldUsername: string, newUsername: string): Promise<void> {
    const db = MongoDatabase.getDb();
    await Promise.all([
      db.collection('reports').updateMany(
        { $or: [{ reporter_id: { $in: variants } }, { reporter_username: oldUsername }] },
        { $set: { reporter_username: newUsername } }
      ),
      db.collection('reports').updateMany(
        { target_author_username: oldUsername },
        { $set: { target_author_username: newUsername } }
      ),
      db.collection('push_subscriptions').updateMany(
        { $or: [{ user_id: { $in: variants } }, { username: oldUsername }] },
        { $set: { username: newUsername } }
      ),
    ]);
  }
}
