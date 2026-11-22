import { SpotifyEmbed } from '@oomfy/shared';
import { toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText } from './OpenGraphParser.js';

function toSafeSpotifyEmbedUrl(raw?: string | null): string {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && u.hostname.toLowerCase() === 'open.spotify.com' && u.pathname.startsWith('/embed/')
      ? u.toString()
      : '';
  } catch { return ''; }
}

export class SpotifyEmbedAdapter {
  private static readonly OEMBED_URL = 'https://open.spotify.com/oembed';

  public static async fetchEmbed(spotifyUrl: string): Promise<SpotifyEmbed> {
    try {
      const response = await fetch(`${this.OEMBED_URL}?url=${encodeURIComponent(spotifyUrl)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) {
        return { type: 'spotify', url: spotifyUrl, title: 'Enlace de Spotify', iframe_url: '', thumbnail_url: '' };
      }

      const data = (await response.json()) as any;
      const iframeSrc = data.html ? toSafeSpotifyEmbedUrl(this.extractIframeSrc(data.html)) : '';
      const thumb = toSafeHttpsAssetUrl(data.thumbnail_url) || '';
      return {
        type: 'spotify',
        url: spotifyUrl,
        title: clampText(data.title, 200) || 'Pista de Spotify',
        iframe_url: iframeSrc,
        thumbnail_url: thumb,
      };
    } catch {
      return { type: 'spotify', url: spotifyUrl, title: 'Enlace de Spotify', iframe_url: '', thumbnail_url: '' };
    }
  }

  private static extractIframeSrc(html: string): string {
    const match = html.match(/src="([^"]+)"/i) || html.match(/src='([^']+)'/i);
    return match ? match[1] : '';
  }
}
