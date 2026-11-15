import { CustomEmote } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export type StoredEmote = CustomEmote & { delete_url?: string | null };

export class MongoEmoteRepository {
  private static indexesSynced = false;

  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('emotes');
  }

  public static async ensurePerUserIndex(): Promise<void> {
    if (this.indexesSynced) return;
    this.indexesSynced = true;
    const col = this.getCollection();
    const idxs = await col.listIndexes().toArray().catch(() => []);
    if (idxs.some((i: any) => i.name === 'name_lower_1' && i.unique)) {
      await col.dropIndex('name_lower_1').catch(() => {});
    }
    await col.createIndex({ creator_id: 1, name_lower: 1 }, { unique: true }).catch(() => {});
  }

  private static toDomain(doc: any): CustomEmote {
    return {
      id: String(doc.id || doc._id),
      name: doc.name,
      image_url: doc.image_url,
      creator_id: String(doc.creator_id),
      creator_username: doc.creator_username,
      created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
    };
  }

  public static async create(emote: StoredEmote): Promise<CustomEmote> {
    await this.ensurePerUserIndex();
    const doc = {
      _id: MongoIdHelper.toMongoId(emote.id),
      id: emote.id,
      name: emote.name,
      name_lower: emote.name.toLowerCase(),
      image_url: emote.image_url,
      delete_url: emote.delete_url || null,
      creator_id: String(emote.creator_id),
      creator_username: emote.creator_username,
      created_at: emote.created_at,
    };
    await this.getCollection().insertOne(doc);
    return this.toDomain(doc);
  }

  public static async findByCreatorAndName(creatorId: string, name: string): Promise<StoredEmote | null> {
    const doc = await this.getCollection().findOne({
      ...MongoIdHelper.fieldFilter('creator_id', creatorId),
      name_lower: name.trim().toLowerCase(),
    });
    return doc ? { ...this.toDomain(doc), delete_url: doc.delete_url || null } : null;
  }

  public static async findByName(name: string): Promise<StoredEmote | null> {
    const doc = await this.getCollection().findOne({ name_lower: name.trim().toLowerCase() });
    return doc ? { ...this.toDomain(doc), delete_url: doc.delete_url || null } : null;
  }

  public static async findById(id: string): Promise<StoredEmote | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id));
    return doc ? { ...this.toDomain(doc), delete_url: doc.delete_url || null } : null;
  }

  public static async search(query?: string, limit = 200, creatorId?: string): Promise<CustomEmote[]> {
    const clean = query?.trim().toLowerCase();
    const filter: Record<string, any> = clean ? { name_lower: { $regex: new RegExp(MongoIdHelper.escapeRegex(clean), 'i') } } : {};
    if (creatorId) Object.assign(filter, MongoIdHelper.fieldFilter('creator_id', creatorId));
    const safeLimit = Math.min(Math.max(1, limit || 200), 500);
    const docs = await this.getCollection().find(filter).sort({ name_lower: 1 }).limit(safeLimit).toArray();
    return docs.map((d) => this.toDomain(d));
  }

  public static async countByCreatorId(creatorId: string): Promise<number> {
    return this.getCollection().countDocuments(MongoIdHelper.fieldFilter('creator_id', creatorId));
  }

  public static async deleteById(id: string): Promise<boolean> {
    const res = await this.getCollection().deleteOne(MongoIdHelper.idFilter(id));
    return res.deletedCount > 0;
  }
}
