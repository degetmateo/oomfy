import { BookmarkEntry, BookmarkFolder, LIMITS } from '@oomfy/shared';
import { MongoBookmarkRepository } from '../../infrastructure/repositories/mongo/MongoBookmarkRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoBlockRepository } from '../../infrastructure/repositories/mongo/MongoBlockRepository.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export class BookmarkService {
  private static async assertFolderOwnership(userId: string, folderId: string | null | undefined): Promise<string | null> {
    if (!folderId) return null;
    const folder = await MongoBookmarkRepository.findFolderById(userId, folderId);
    if (!folder) throw new NotFoundError('Carpeta de guardados no encontrada.');
    return folder.id;
  }

  public static async listBookmarks(
    userId: string,
    query: { folder_id?: string; limit?: number; offset?: number }
  ): Promise<{ items: BookmarkEntry[]; hasMore: boolean }> {
    const limit = Math.min(Math.max(1, query.limit || 30), LIMITS.PAGINATION_LIMIT_MAX);
    const offset = Math.max(0, query.offset || 0);
    return MongoBookmarkRepository.listBookmarks(userId, {
      folderId: query.folder_id,
      limit,
      offset,
    });
  }

  public static async saveBookmark(
    userId: string,
    publicationId: string,
    folderId?: string | null
  ): Promise<BookmarkEntry> {
    const pub = await MongoPublicationRepository.findById(publicationId, userId);
    if (!pub) throw new NotFoundError('Publicación no encontrada.');
    if (pub.author?.id && pub.author.id !== userId && (await MongoBlockRepository.isBlockedEitherWay(userId, pub.author.id))) {
      throw new ForbiddenError('No puedes guardar publicaciones de este usuario.');
    }

    const resolvedFolderId = folderId === undefined ? undefined : await this.assertFolderOwnership(userId, folderId);
    const entry = await MongoBookmarkRepository.upsertBookmark(userId, publicationId, resolvedFolderId);
    return { ...entry, publication: { ...pub, is_bookmarked: true } };
  }

  public static async removeBookmark(userId: string, publicationId: string): Promise<{ removed: boolean }> {
    const removed = await MongoBookmarkRepository.removeBookmark(userId, publicationId);
    return { removed };
  }

  public static async moveBookmark(
    userId: string,
    publicationId: string,
    folderId: string | null
  ): Promise<BookmarkEntry> {
    const resolvedFolderId = await this.assertFolderOwnership(userId, folderId);
    const moved = await MongoBookmarkRepository.moveBookmark(userId, publicationId, resolvedFolderId);
    if (!moved) throw new NotFoundError('La publicación no está en tus guardados.');
    return moved;
  }

  public static async reorderBookmarks(
    userId: string,
    folderId: string | null | undefined,
    orderedPublicationIds: string[]
  ): Promise<void> {
    const resolvedFolderId = folderId ? await this.assertFolderOwnership(userId, folderId) : null;
    await MongoBookmarkRepository.reorderBookmarks(userId, resolvedFolderId, orderedPublicationIds);
  }

  public static async listFolders(userId: string): Promise<BookmarkFolder[]> {
    return MongoBookmarkRepository.listFolders(userId);
  }

  public static async createFolder(userId: string, name: string): Promise<BookmarkFolder> {
    const existingCount = await MongoBookmarkRepository.countFolders(userId);
    if (existingCount >= LIMITS.BOOKMARK_FOLDERS_MAX) {
      throw new BadRequestError(`Puedes crear hasta ${LIMITS.BOOKMARK_FOLDERS_MAX} carpetas.`);
    }
    try {
      return await MongoBookmarkRepository.createFolder(userId, name.trim());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictError('Ya tienes una carpeta con ese nombre.');
      }
      throw err;
    }
  }

  public static async renameFolder(userId: string, folderId: string, name: string): Promise<BookmarkFolder> {
    try {
      const updated = await MongoBookmarkRepository.renameFolder(userId, folderId, name.trim());
      if (!updated) throw new NotFoundError('Carpeta no encontrada.');
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictError('Ya tienes una carpeta con ese nombre.');
      }
      throw err;
    }
  }

  public static async deleteFolder(userId: string, folderId: string): Promise<{ deleted: boolean }> {
    const deleted = await MongoBookmarkRepository.deleteFolder(userId, folderId);
    if (!deleted) throw new NotFoundError('Carpeta no encontrada.');
    return { deleted: true };
  }
}
