import { CustomEmote } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';

export type StoredEmote = CustomEmote & { delete_url?: string | null };

export class MongoEmoteRepository {
  private static getCollection() {
    return MongoDatabase.getDb().collection<any>('emotes');
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

  public static async findByName(name: string): Promise<StoredEmote | null> {
    const doc = await this.getCollection().findOne({ name_lower: name.trim().toLowerCase() });
    return doc ? { ...this.toDomain(doc), delete_url: doc.delete_url || null } : null;
  }

  public static async findById(id: string): Promise<StoredEmote | null> {
    const doc = await this.getCollection().findOne(MongoIdHelper.idFilter(id));
    return doc ? { ...this.toDomain(doc), delete_url: doc.delete_url || null } : null;
  }

  public static async search(query?: string, limit = 100): Promise<CustomEmote[]> {
    const clean = query?.trim().toLowerCase();
    const filter = clean ? { name_lower: { $regex: new RegExp(MongoIdHelper.escapeRegex(clean), 'i') } } : {};
    const safeLimit = Math.min(Math.max(1, limit || 100), 200);
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
