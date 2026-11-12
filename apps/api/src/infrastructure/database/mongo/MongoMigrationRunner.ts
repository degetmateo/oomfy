import { Db, Collection, IndexSpecification, CreateIndexesOptions } from 'mongodb';
import { MongoDatabase } from './MongoDatabase.js';
import { UuidMigrationService } from './UuidMigrationService.js';

export class MongoMigrationRunner {
  private static async safeCreateIndex(col: Collection, spec: IndexSpecification, options?: CreateIndexesOptions): Promise<void> {
    try {
      await col.createIndex(spec, options);
    } catch (err: any) {
      if (err.code !== 85 && err.code !== 86) throw err;
    }
  }

  public static async ensureIndexes(): Promise<void> {
    const db: Db = await MongoDatabase.connect();

    const publications = db.collection('publications');
    await this.safeCreateIndex(publications, { created_at: -1 });
    await this.safeCreateIndex(publications, { type: 1, created_at: -1 });
    await this.safeCreateIndex(publications, { 'author.username': 1, created_at: -1 });
    await this.safeCreateIndex(publications, { 'author.id': 1, type: 1 });
    await this.safeCreateIndex(publications, { parent_publication_id: 1 });
    await this.safeCreateIndex(publications, { root_publication_id: 1 });

    const members = db.collection('members');
    await this.safeCreateIndex(members, { username: 1 });
    await this.safeCreateIndex(members, { created_at: -1 });

    const follows = db.collection('follows');
    await this.safeCreateIndex(follows, { follower_id: 1, followed_id: 1 }, { unique: true });
    await this.safeCreateIndex(follows, { 'follower.username': 1 });
    await this.safeCreateIndex(follows, { 'followed.username': 1 });

    const upvotes = db.collection('upvotes');
    await this.safeCreateIndex(upvotes, { user_id: 1, publication_id: 1 }, { unique: true });
    await this.safeCreateIndex(upvotes, { publication_id: 1 });

    const notifications = db.collection('notifications');
    await this.safeCreateIndex(notifications, { recipient_id: 1, created_at: -1 });
    await this.safeCreateIndex(notifications, { recipient_id: 1, status: 1 });
  }

  public static async run(): Promise<void> {
    const db: Db = await MongoDatabase.connect();
    await this.ensureIndexes();

    const members = db.collection('members');
    await members.updateMany({ terms_accepted: { $exists: false } }, { $set: { terms_accepted: false } });
    await members.updateMany(
      { $or: [{ follower_count: { $lt: 0 } }, { followed_count: { $lt: 0 } }, { publication_count: { $lt: 0 } }] },
      { $max: { follower_count: 0, followed_count: 0, publication_count: 0 } }
    );

    const publications = db.collection('publications');
    await publications.updateMany(
      { $or: [{ shares_count: { $lt: 0 } }, { share_count: { $lt: 0 } }, { upvotes_count: { $lt: 0 } }, { upvote_count: { $lt: 0 } }, { quotes_count: { $lt: 0 } }, { quote_count: { $lt: 0 } }, { comments_count: { $lt: 0 } }, { comment_count: { $lt: 0 } }] },
      { $max: { shares_count: 0, share_count: 0, upvotes_count: 0, upvote_count: 0, quotes_count: 0, quote_count: 0, comments_count: 0, comment_count: 0 } }
    );
    const stringDocs = await publications.find({ created_at: { $type: 'string' } }).toArray();
    for (const doc of stringDocs) {
      const d = new Date(doc.created_at);
      if (!isNaN(d.getTime())) {
        await publications.updateOne({ _id: doc._id }, { $set: { created_at: d } });
      }
    }

    await UuidMigrationService.migrateAll();
  }
}
