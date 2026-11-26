import { v7 as uuidv7 } from 'uuid';
import { BookmarkEntry, BookmarkFolder } from '@oomfy/shared';
import { MongoDatabase } from '../../database/mongo/MongoDatabase.js';
import { MongoIdHelper } from './MongoIdHelper.js';
import { MongoPublicationRepository } from './MongoPublicationRepository.js';

function toIdString(val: any): string {
  if (val && typeof val === 'object' && typeof val.toUUID === 'function') {
    try {
      return val.toUUID().toString();
    } catch { /* fall back to String */ }
  }
  return String(val ?? '');
}

function folderFilterValue(folderId?: string | null) {
  return folderId ? { $in: MongoIdHelper.idVariants(folderId) } : null;
}

function mapFolder(doc: any, countMap: Map<string, number>): BookmarkFolder {
  const id = toIdString(doc.id || doc._id);
  return {
    id,
    user_id: toIdString(doc.user_id),
    name: doc.name,
    position: typeof doc.position === 'number' ? doc.position : 0,
    items_count: countMap.get(id.toLowerCase()) || 0,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function mapBookmark(doc: any, pubMap?: Map<string, any>): BookmarkEntry {
  const pubId = toIdString(doc.publication_id);
  return {
    id: toIdString(doc.id || doc._id),
    user_id: toIdString(doc.user_id),
    publication_id: pubId,
    folder_id: doc.folder_id ? toIdString(doc.folder_id) : null,
    position: typeof doc.position === 'number' ? doc.position : 0,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    ...(pubMap ? { publication: pubMap.get(pubId.toLowerCase()) ?? null } : {}),
  };
}

export class MongoBookmarkRepository {
  private static bookmarksCol() {
    return MongoDatabase.getDb().collection<any>('bookmarks');
  }

  private static foldersCol() {
    return MongoDatabase.getDb().collection<any>('bookmark_folders');
  }

  private static async getMinPosition(userId: string, folderId: string | null): Promise<number> {
    const doc = await this.bookmarksCol()
      .find({
        user_id: { $in: MongoIdHelper.idVariants(userId) },
        folder_id: folderFilterValue(folderId),
      })
      .sort({ position: 1 })
      .limit(1)
      .next();
    return typeof doc?.position === 'number' ? doc.position - 1 : 0;
  }

  public static async listFolders(userId: string): Promise<BookmarkFolder[]> {
    const userVariants = MongoIdHelper.idVariants(userId);
    const [folderDocs, countAgg] = await Promise.all([
      this.foldersCol().find({ user_id: { $in: userVariants } }).sort({ position: 1, created_at: 1 }).toArray(),
      this.bookmarksCol()
        .aggregate([
          { $match: { user_id: { $in: userVariants }, folder_id: { $ne: null } } },
          { $group: { _id: '$folder_id', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const countMap = new Map<string, number>();
    for (const row of countAgg) {
      if (row?._id) countMap.set(toIdString(row._id).toLowerCase(), row.count || 0);
    }
    return folderDocs.map((doc) => mapFolder(doc, countMap));
  }

  public static async countFolders(userId: string): Promise<number> {
    return this.foldersCol().countDocuments({ user_id: { $in: MongoIdHelper.idVariants(userId) } });
  }

  public static async findFolderById(userId: string, folderId: string): Promise<BookmarkFolder | null> {
    const doc = await this.foldersCol().findOne({
      $and: [MongoIdHelper.idFilter(folderId), { user_id: { $in: MongoIdHelper.idVariants(userId) } }],
    });
    if (!doc) return null;
    const resolvedId = toIdString(doc.id || doc._id);
    const count = await this.bookmarksCol().countDocuments({
      user_id: { $in: MongoIdHelper.idVariants(userId) },
      folder_id: { $in: MongoIdHelper.idVariants(resolvedId) },
    });
    return mapFolder(doc, new Map([[resolvedId.toLowerCase(), count]]));
  }

  public static async createFolder(userId: string, name: string): Promise<BookmarkFolder> {
    const id = uuidv7();
    const now = new Date().toISOString();
    const count = await this.countFolders(userId);
    const uuidId = MongoIdHelper.toMongoId(id);
    const userUuid = MongoIdHelper.toMongoId(userId);
    const doc = {
      _id: uuidId,
      id: uuidId,
      user_id: userUuid,
      name,
      name_lower: name.toLowerCase(),
      position: count,
      created_at: now,
      updated_at: now,
    };
    await this.foldersCol().insertOne(doc);
    return mapFolder(doc, new Map());
  }

  public static async renameFolder(userId: string, folderId: string, name: string): Promise<BookmarkFolder | null> {
    const now = new Date().toISOString();
    const res = await this.foldersCol().updateOne(
      { $and: [MongoIdHelper.idFilter(folderId), { user_id: { $in: MongoIdHelper.idVariants(userId) } }] },
      { $set: { name, name_lower: name.toLowerCase(), updated_at: now } }
    );
    if ((res.matchedCount ?? 0) === 0) return null;
    return this.findFolderById(userId, folderId);
  }

  public static async deleteFolder(userId: string, folderId: string): Promise<boolean> {
    const userVariants = MongoIdHelper.idVariants(userId);
    const delRes = await this.foldersCol().deleteOne({
      $and: [MongoIdHelper.idFilter(folderId), { user_id: { $in: userVariants } }],
    });
    if ((delRes.deletedCount ?? 0) === 0) return false;
    await this.bookmarksCol().updateMany(
      { user_id: { $in: userVariants }, folder_id: { $in: MongoIdHelper.idVariants(folderId) } },
      { $set: { folder_id: null, updated_at: new Date().toISOString() } }
    );
    return true;
  }

  public static async upsertBookmark(
    userId: string,
    publicationId: string,
    folderId?: string | null
  ): Promise<BookmarkEntry> {
    const col = this.bookmarksCol();
    const userVariants = MongoIdHelper.idVariants(userId);
    const pubVariants = MongoIdHelper.idVariants(publicationId);
    const existing = await col.findOne({ user_id: { $in: userVariants }, publication_id: { $in: pubVariants } });
    const now = new Date().toISOString();

    if (existing) {
      if (folderId !== undefined) {
        const nextFolder = folderId ? MongoIdHelper.toMongoId(folderId) : null;
        const nextPos = await this.getMinPosition(userId, folderId ?? null);
        await col.updateOne(
          { _id: existing._id },
          { $set: { folder_id: nextFolder, position: nextPos, updated_at: now } }
        );
        return mapBookmark({ ...existing, folder_id: nextFolder, position: nextPos, updated_at: now });
      }
      return mapBookmark(existing);
    }

    const normalizedFolder = folderId ?? null;
    const position = await this.getMinPosition(userId, normalizedFolder);
    const id = uuidv7();
    const doc = {
      _id: MongoIdHelper.toMongoId(id),
      id: MongoIdHelper.toMongoId(id),
      user_id: MongoIdHelper.toMongoId(userId),
      publication_id: MongoIdHelper.toMongoId(publicationId),
      folder_id: normalizedFolder ? MongoIdHelper.toMongoId(normalizedFolder) : null,
      position,
      created_at: now,
      updated_at: now,
    };
    await col.insertOne(doc);
    return mapBookmark(doc);
  }

  public static async removeBookmark(userId: string, publicationId: string): Promise<boolean> {
    const res = await this.bookmarksCol().deleteMany({
      user_id: { $in: MongoIdHelper.idVariants(userId) },
      publication_id: { $in: MongoIdHelper.idVariants(publicationId) },
    });
    return (res.deletedCount ?? 0) > 0;
  }

  public static async moveBookmark(
    userId: string,
    publicationId: string,
    folderId: string | null
  ): Promise<BookmarkEntry | null> {
    const col = this.bookmarksCol();
    const existing = await col.findOne({
      user_id: { $in: MongoIdHelper.idVariants(userId) },
      publication_id: { $in: MongoIdHelper.idVariants(publicationId) },
    });
    if (!existing) return null;
    const position = await this.getMinPosition(userId, folderId);
    const now = new Date().toISOString();
    const nextFolder = folderId ? MongoIdHelper.toMongoId(folderId) : null;
    await col.updateOne(
      { _id: existing._id },
      { $set: { folder_id: nextFolder, position, updated_at: now } }
    );
    return mapBookmark({ ...existing, folder_id: nextFolder, position, updated_at: now });
  }

  public static async reorderBookmarks(
    userId: string,
    folderId: string | null,
    orderedPublicationIds: string[]
  ): Promise<void> {
    if (orderedPublicationIds.length === 0) return;
    const now = new Date().toISOString();
    const userVariants = MongoIdHelper.idVariants(userId);
    const folderFilter = folderFilterValue(folderId);
    const ops = orderedPublicationIds.map((pubId, idx) => ({
      updateOne: {
        filter: {
          user_id: { $in: userVariants },
          folder_id: folderFilter,
          publication_id: { $in: MongoIdHelper.idVariants(pubId) },
        },
        update: { $set: { position: idx, updated_at: now } },
      },
    }));
    await this.bookmarksCol().bulkWrite(ops);
  }

  public static async listBookmarks(
    userId: string,
    opts: { folderId?: string; limit: number; offset: number }
  ): Promise<{ items: BookmarkEntry[]; hasMore: boolean }> {
    const userVariants = MongoIdHelper.idVariants(userId);
    const query: any = { user_id: { $in: userVariants } };
    let sort: Record<string, 1 | -1> = { created_at: -1, _id: -1 };

    if (opts.folderId && opts.folderId !== 'all') {
      sort = { position: 1, created_at: -1 };
      query.folder_id = opts.folderId === 'unfiled' ? null : { $in: MongoIdHelper.idVariants(opts.folderId) };
    }

    const docs = await this.bookmarksCol()
      .find(query)
      .sort(sort)
      .skip(Math.max(0, opts.offset))
      .limit(opts.limit + 1)
      .toArray();

    const hasMore = docs.length > opts.limit;
    const slice = hasMore ? docs.slice(0, opts.limit) : docs;
    const pubIds = Array.from(new Set(slice.map((d) => toIdString(d.publication_id)).filter(Boolean)));
    const pubs = pubIds.length > 0 ? await MongoPublicationRepository.findManyByIds(pubIds, userId) : [];
    const pubMap = new Map(pubs.map((p) => [p.id.toLowerCase(), p]));

    return {
      items: slice.map((d) => mapBookmark(d, pubMap)),
      hasMore,
    };
  }

  public static async deleteByPublicationId(publicationId: string): Promise<void> {
    await this.bookmarksCol().deleteMany({ publication_id: { $in: MongoIdHelper.idVariants(publicationId) } });
  }

  public static async deleteByUserId(userId: string): Promise<void> {
    const userVariants = MongoIdHelper.idVariants(userId);
    await Promise.all([
      this.bookmarksCol().deleteMany({ user_id: { $in: userVariants } }),
      this.foldersCol().deleteMany({ user_id: { $in: userVariants } }),
    ]);
  }
}
