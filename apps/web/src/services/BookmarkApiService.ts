import { BookmarkEntry, BookmarkFolder } from '@oomfy/shared';
import { ApiClient } from './api.js';

export class BookmarkApiService {
  public static async listBookmarks(
    folderId: string = 'all',
    limit = 30,
    offset = 0
  ): Promise<{ items: BookmarkEntry[]; hasMore: boolean }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (folderId && folderId !== 'all') params.set('folder_id', folderId);
    const res = await ApiClient.get<{ success: boolean; data: { items: BookmarkEntry[]; hasMore: boolean } }>(
      `/bookmarks?${params.toString()}`
    );
    return res?.data || { items: [], hasMore: false };
  }

  public static async listFolders(): Promise<BookmarkFolder[]> {
    const res = await ApiClient.get<{ success: boolean; data: BookmarkFolder[] }>('/bookmarks/folders');
    return res?.data || [];
  }

  public static async createFolder(name: string): Promise<BookmarkFolder> {
    const res = await ApiClient.post<{ success: boolean; data: BookmarkFolder }>('/bookmarks/folders', { name });
    return res.data;
  }

  public static async renameFolder(folderId: string, name: string): Promise<BookmarkFolder> {
    const res = await ApiClient.patch<{ success: boolean; data: BookmarkFolder }>(`/bookmarks/folders/${folderId}`, { name });
    return res.data;
  }

  public static async deleteFolder(folderId: string): Promise<void> {
    await ApiClient.delete(`/bookmarks/folders/${folderId}`);
  }

  public static async moveBookmark(publicationId: string, folderId: string | null): Promise<BookmarkEntry> {
    const res = await ApiClient.patch<{ success: boolean; data: BookmarkEntry }>(
      `/bookmarks/${publicationId}/folder`,
      { folder_id: folderId }
    );
    return res.data;
  }

  public static async removeBookmark(publicationId: string): Promise<void> {
    await ApiClient.delete(`/bookmarks/${publicationId}`);
  }

  public static async reorderBookmarks(folderId: string | null, orderedPublicationIds: string[]): Promise<void> {
    await ApiClient.put('/bookmarks/reorder', {
      folder_id: folderId,
      ordered_publication_ids: orderedPublicationIds,
    });
  }
}
