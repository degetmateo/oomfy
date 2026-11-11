import { Environment } from '../../config/Environment.js';
import { BadRequestError } from '../../errors/AppError.js';
import { stripImageMetadata } from '../../utils/ImageMetadataStripper.js';
import { isSafePublicHttpUrl } from '../../utils/UrlSecurityHelper.js';

export interface ImgBBUploadResult {
  url: string;
  delete_url: string;
  imgbb_id: string;
}

export class ImgBBStorageAdapter {
  private static readonly UPLOAD_URL = 'https://api.imgbb.com/1/upload';

  public static async upload(imageBuffer: Buffer): Promise<ImgBBUploadResult> {
    if (!Environment.IMGBB_KEY) {
      throw new BadRequestError('ImgBB API Key no configurada en el servidor.');
    }

    const sanitized = stripImageMetadata(imageBuffer);
    const formData = new FormData();
    formData.append('image', sanitized.toString('base64'));

    const response = await fetch(`${this.UPLOAD_URL}?key=${Environment.IMGBB_KEY}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(8000),
    });

    const data = (await response.json()) as any;
    if (!data?.success) {
      throw new BadRequestError('Error al subir la imagen a ImgBB.');
    }

    return {
      url: data.data.display_url || data.data.url,
      delete_url: data.data.delete_url,
      imgbb_id: data.data.id,
    };
  }

  public static async delete(deleteUrl?: string | null): Promise<void> {
    if (!deleteUrl) return;
    try {
      const parsed = await isSafePublicHttpUrl(deleteUrl);
      if (!parsed || parsed.protocol !== 'https:') return;
      const host = parsed.hostname.toLowerCase();
      if (host !== 'ibb.co' && !host.endsWith('.ibb.co')) return;
      await fetch(parsed.toString(), { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000) });
    } catch {
      /* ignore non-fatal remote cleanup failure */
    }
  }
}
