import { MediaItem, MediaWarning } from '@oomfy/shared';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { isGifBuffer } from '../../utils/GifLoopNormalizer.js';

function normalizeWarning(value: unknown): MediaWarning | undefined {
  return value === 'spoiler' || value === 'sensitive' ? value : undefined;
}

export class PublicationMediaHelper {
  public static parseTenorList(rawTenor: unknown): Array<{ src?: string; index?: number; warning?: MediaWarning | null }> {
    if (typeof rawTenor === 'string') {
      try {
        return JSON.parse(rawTenor);
      } catch {
        return [];
      }
    }
    return Array.isArray(rawTenor) ? rawTenor : [];
  }

  public static parseImageWarnings(rawWarnings: unknown): Array<MediaWarning | null> {
    if (typeof rawWarnings === 'string') {
      try {
        const parsed = JSON.parse(rawWarnings);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(rawWarnings) ? rawWarnings : [];
  }

  public static async buildMediaItems(
    imageFiles: Express.Multer.File[],
    tenorList: Array<{ src?: string; index?: number; warning?: MediaWarning | null }>,
    imageWarnings: Array<MediaWarning | null> = []
  ): Promise<MediaItem[]> {
    const mediaItems: MediaItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const isGif = isGifBuffer(file.buffer) || file.mimetype === 'image/gif';
      const warning = normalizeWarning(imageWarnings[i]);
      const upload = await ImgBBStorageAdapter.upload(file.buffer);
      mediaItems.push({
        url: upload.url,
        source: 'imgbb',
        index: i,
        ...(warning ? { warning } : {}),
        ...(isGif ? { is_gif: true } : {}),
        delete_url: upload.delete_url,
        imgbb_id: upload.imgbb_id,
      });
    }
    for (const t of tenorList) {
      if (t && typeof t.src === 'string' && t.src.trim().length > 0) {
        const warning = normalizeWarning(t.warning);
        mediaItems.push({
          url: t.src.trim(),
          source: 'tenor',
          index: t.index ?? 0,
          is_gif: true,
          ...(warning ? { warning } : {}),
        });
      }
    }
    return mediaItems.slice(0, 4);
  }
}

