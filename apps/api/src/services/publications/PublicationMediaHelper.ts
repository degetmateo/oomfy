import { MediaItem } from '@oomfy/shared';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';

export class PublicationMediaHelper {
  public static parseTenorList(rawTenor: unknown): Array<{ src?: string; index?: number }> {
    if (typeof rawTenor === 'string') {
      try {
        return JSON.parse(rawTenor);
      } catch {
        return [];
      }
    }
    return Array.isArray(rawTenor) ? rawTenor : [];
  }

  public static async buildMediaItems(
    imageFiles: Express.Multer.File[],
    tenorList: Array<{ src?: string; index?: number }>
  ): Promise<MediaItem[]> {
    const mediaItems: MediaItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const upload = await ImgBBStorageAdapter.upload(imageFiles[i].buffer);
      mediaItems.push({
        url: upload.url,
        source: 'imgbb',
        index: i,
        delete_url: upload.delete_url,
        imgbb_id: upload.imgbb_id,
      });
    }
    for (const t of tenorList) {
      if (t && typeof t.src === 'string' && t.src.trim().length > 0) {
        mediaItems.push({ url: t.src.trim(), source: 'tenor', index: t.index ?? 0 });
      }
    }
    return mediaItems.slice(0, 4);
  }
}

