import { Environment } from '../../config/Environment.js';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
}

export class KlipyAdapter {
  private static baseUrl = 'https://api.klipy.com/v2';

  public static async search(query: string, limit: number = 20): Promise<GifItem[]> {
    const key = Environment.KLIPY_KEY;
    if (!key) return [];

    try {
      const url = query
        ? `${this.baseUrl}/search?q=${encodeURIComponent(query)}&key=${key}&limit=${limit}`
        : `${this.baseUrl}/featured?key=${key}&limit=${limit}`;

      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json() as any;
      const results = data.results || [];

      return results.map((r: any) => ({
        id: String(r.id),
        title: r.title || 'GIF',
        url: r.media_formats?.gif?.url || r.media_formats?.mediumgif?.url || '',
        preview_url: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url || r.media_formats?.gif?.url || '',
      })).filter((g: GifItem) => Boolean(g.url));
    } catch (err) {
      console.error('Error fetching GIFs from Klipy:', err);
      return [];
    }
  }
}

