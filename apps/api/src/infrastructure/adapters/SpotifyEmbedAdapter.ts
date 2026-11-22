import { SpotifyEmbed } from '@oomfy/shared';
import { toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText } from './OpenGraphParser.js';

const KIND_LABELS: Record<string, string> = {
  track: 'Pista', album: 'Álbum', playlist: 'Playlist', episode: 'Episodio', show: 'Podcast', artist: 'Artista',
};

function detectMediaKind(spotifyUrl: string): string {
  try {
    const seg = new URL(spotifyUrl).pathname.split('/').filter(Boolean).find((s) => KIND_LABELS[s.toLowerCase()]);
    return seg ? KIND_LABELS[seg.toLowerCase()] : 'Audio';
  } catch { return 'Audio'; }
}

function toSafeSpotifyEmbedUrl(raw?: string | null): string {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== 'open.spotify.com' || !u.pathname.startsWith('/embed/')) return '';
    u.searchParams.set('theme', '0');
    return u.toString();
  } catch { return ''; }
}

export class SpotifyEmbedAdapter {
  private static readonly OEMBED_URL = 'https://open.spotify.com/oembed';

  public static async fetchEmbed(spotifyUrl: string): Promise<SpotifyEmbed> {
    const mediaKind = detectMediaKind(spotifyUrl);
    try {
      const response = await fetch(`${this.OEMBED_URL}?url=${encodeURIComponent(spotifyUrl)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) {
        return { type: 'spotify', url: spotifyUrl, title: `${mediaKind} de Spotify`, site_name: 'Spotify', media_kind: mediaKind, iframe_url: '', thumbnail_url: '' };
      }

      const data = (await response.json()) as any;
      const iframeSrc = data.html ? toSafeSpotifyEmbedUrl(this.extractIframeSrc(data.html)) : '';
      const thumb = toSafeHttpsAssetUrl(data.thumbnail_url) || '';
      const author = clampText(data.author_name, 100);
      return {
        type: 'spotify', url: spotifyUrl, site_name: 'Spotify', media_kind: mediaKind,
        title: clampText(data.title, 200) || `${mediaKind} de Spotify`,
        description: author ? `${mediaKind} • ${author}` : `${mediaKind} en Spotify`,
        author_name: author, iframe_url: iframeSrc, thumbnail_url: thumb,
      };
    } catch {
      return { type: 'spotify', url: spotifyUrl, title: `${mediaKind} de Spotify`, site_name: 'Spotify', media_kind: mediaKind, iframe_url: '', thumbnail_url: '' };
    }
  }

  private static extractIframeSrc(html: string): string {
    const match = html.match(/src="([^"]+)"/i) || html.match(/src='([^']+)'/i);
    return match ? match[1] : '';
  }
}
