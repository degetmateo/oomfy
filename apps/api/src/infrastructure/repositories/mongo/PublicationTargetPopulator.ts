import { Publication } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { PublicationMapper } from './PublicationMapper.js';

export class PublicationTargetPopulator {
  public static async populate(posts: Publication[]): Promise<Publication[]> {
    if (!posts || posts.length === 0) return posts;
    const col = MongoDatabase.getDb().collection<any>('publications');

    const needed = posts.filter((p) => !p.target_publication && p.parent_publication_id);
    if (needed.length === 0) return posts;

    const targetIds = Array.from(new Set(needed.map((p) => String(p.parent_publication_id))));
    const filters = targetIds.flatMap((id) => MongoIdHelper.idFilter(id).$or);
    const targetDocs = await col.find({ $or: filters }).toArray();
    const map = new Map<string, Publication>();

    for (const doc of targetDocs) {
      const domain = PublicationMapper.toDomain(doc);
      const rawId = doc._id ? doc._id.toString() : doc.id;
      map.set(domain.id.toLowerCase(), domain);
      if (rawId) map.set(rawId.toLowerCase(), domain);
      if (doc.id) map.set(String(doc.id).toLowerCase(), domain);
      if (doc.old_id) map.set(String(doc.old_id), domain);
    }

    for (const p of posts) {
      if (!p.target_publication && p.parent_publication_id) {
        const key = String(p.parent_publication_id).toLowerCase();
        const found = map.get(key);
        if (found) p.target_publication = found;
      }
    }

    const nestedNeeded = Array.from(map.values()).filter(
      (p) => !p.target_publication && p.parent_publication_id && p.type === 'quote'
    );
    if (nestedNeeded.length > 0) {
      const nestedTargetIds = Array.from(new Set(nestedNeeded.map((p) => String(p.parent_publication_id))));
      const nestedFilters = nestedTargetIds.flatMap((id) => MongoIdHelper.idFilter(id).$or);
      const nestedDocs = await col.find({ $or: nestedFilters }).toArray();
      for (const doc of nestedDocs) {
        const domain = PublicationMapper.toDomain(doc);
        const rawId = doc._id ? doc._id.toString() : doc.id;
        map.set(domain.id.toLowerCase(), domain);
        if (rawId) map.set(rawId.toLowerCase(), domain);
      }
      for (const p of nestedNeeded) {
        const key = String(p.parent_publication_id).toLowerCase();
        const found = map.get(key);
        if (found) p.target_publication = found;
      }
    }

    return posts;
  }
}
