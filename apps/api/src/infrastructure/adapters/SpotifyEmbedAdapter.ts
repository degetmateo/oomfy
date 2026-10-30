import { SpotifyEmbed } from '@oomfy/shared';
import { BadRequestError } from '../../errors/AppError.js';

export class SpotifyEmbedAdapter {
  private static readonly OEMBED_URL = 'https://open.spotify.com/oembed';

  public static async fetchEmbed(spotifyUrl: string): Promise<SpotifyEmbed> {
    try {
      const response = await fetch(`${this.OEMBED_URL}?url=${encodeURIComponent(spotifyUrl)}`);
      if (!response.ok) {
        throw new BadRequestError('Enlace de Spotify no válido o no encontrado.');
      }

      const data = (await response.json()) as any;
      return {
        type: 'spotify',
        url: spotifyUrl,
        title: data.title || 'Pista de Spotify',
        iframe_url: data.html ? this.extractIframeSrc(data.html) : spotifyUrl,
        thumbnail_url: data.thumbnail_url || '',
      };
    } catch {
      throw new BadRequestError('Error al procesar el enlace de Spotify.');
    }
  }

  private static extractIframeSrc(html: string): string {
    const match = html.match(/src="([^"]+)"/);
    return match ? match[1] : '';
  }
}

