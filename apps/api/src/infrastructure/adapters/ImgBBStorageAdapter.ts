import { Environment } from '../../config/Environment.js';
import { BadRequestError } from '../../errors/AppError.js';

export interface UploadResult {
  url: string;
  delete_url: string;
  imgbb_id: string;
}

export class ImgBBStorageAdapter {
  private static readonly API_URL = 'https://api.imgbb.com/1/upload';

  public static async upload(buffer: Buffer): Promise<UploadResult> {
    if (!Environment.IMGBB_KEY) {
      throw new BadRequestError('Servicio de almacenamiento de imágenes no configurado.');
    }

    const formData = new FormData();
    formData.append('image', buffer.toString('base64'));

    const response = await fetch(`${this.API_URL}?key=${Environment.IMGBB_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as any;
    if (!response.ok || !data.success) {
      throw new BadRequestError(data?.error?.message || 'Error al subir la imagen.');
    }

    return {
      url: data.data.url,
      delete_url: data.data.delete_url,
      imgbb_id: data.data.id,
    };
  }

  public static async delete(deleteUrl: string): Promise<void> {
    try {
      await fetch(deleteUrl, { method: 'GET' });
    } catch (err) {
      console.warn('⚠️ No se pudo eliminar imagen remota:', err);
    }
  }
}

