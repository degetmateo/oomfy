import { Environment } from '../../config/Environment.js';
import { BadRequestError } from '../../errors/AppError.js';

export interface TenorGif {
  id: string;
  url: string;
  preview: string;
  description: string;
}

export class TenorAdapter {
  private static readonly API_URL = 'https://tenor.googleapis.com/v2/search';

  public static async searchGifs(query: string, limit: number = 20): Promise<TenorGif[]> {
    if (!Environment.TENOR_KEY) {
      return [];
    }

    const url = `${this.API_URL}?q=${encodeURIComponent(query)}&key=${Environment.TENOR_KEY}&limit=${limit}&client_key=oomfy_app`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestError('Error al consultar GIFs en Tenor.');
    }

    const data = (await response.json()) as any;
    return (data.results || []).map((item: any) => ({
      id: item.id,
      url: item.media_formats?.gif?.url || item.url,
      preview: item.media_formats?.tinygif?.url || item.itemurl,
      description: item.content_description || '',
    }));
  }
}

