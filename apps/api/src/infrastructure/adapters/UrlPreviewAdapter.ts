import { SpotifyEmbedAdapter } from './SpotifyEmbedAdapter.js';
import { SocialOEmbedAdapter } from './SocialOEmbedAdapter.js';
import { MongoPublicationRepository } from '../repositories/mongo/MongoPublicationRepository.js';

export interface LinkPreview {
  type: 'spotify' | 'twitter' | 'tiktok' | 'youtube' | 'link' | 'quote';
  url: string;
  title?: string;
  description?: string;
  author_name?: string;
  author_username?: string;
  thumbnail_url?: string;
  image?: string | null;
  site_name?: string;
  target_publication?: any;
}

export class UrlPreviewAdapter {
  public static extractFirstUrl(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  public static async getPreview(url: string): Promise<LinkPreview | null> {
    try {
      if (url.includes('open.spotify.com/')) {
        const spotify = await SpotifyEmbedAdapter.fetchEmbed(url);
        return {
          type: 'spotify',
          url,
          title: spotify.title,
          image: spotify.thumbnail_url,
          thumbnail_url: spotify.thumbnail_url,
          site_name: 'Spotify',
        };
      }

      if (/twitter\.com|x\.com/i.test(url) && /\/status\//i.test(url)) {
        const twitter = await SocialOEmbedAdapter.fetchTwitter(url);
        if (twitter) return twitter;
      }

      if (/tiktok\.com/i.test(url)) {
        const tiktok = await SocialOEmbedAdapter.fetchTikTok(url);
        if (tiktok) return tiktok;
      }

      if (/youtube\.com|youtu\.be/i.test(url)) {
        const yt = await SocialOEmbedAdapter.fetchYouTube(url);
        if (yt) return yt;
      }

      const internalMatch = url.match(/(?:publication|post)\/([a-zA-Z0-9_-]+)/i);
      if (internalMatch) {
        const pub = await MongoPublicationRepository.findById(internalMatch[1]);
        if (pub) {
          return {
            type: 'quote',
            url,
            title: `${pub.author.name} (@${pub.author.username})`,
            description: pub.content || 'Publicación en oomfy',
            target_publication: pub,
          };
        }
      }

      const res = await fetch(url, {
        signal: AbortSignal.timeout(3500),
        headers: { 'User-Agent': 'oomfy-bot/1.0 (+https://oomfy.online)' },
      });

      if (!res.ok) return null;
      const html = await res.text();
      const domain = new URL(url).hostname;

      const titleMatch = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i) ||
                         html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta property=["']og:description["'] content=["'](.*?)["']/i) ||
                        html.match(/<meta name=["']description["'] content=["'](.*?)["']/i);
      const imgMatch = html.match(/<meta property=["']og:image["'] content=["'](.*?)["']/i);

      return {
        type: 'link',
        url,
        title: titleMatch ? titleMatch[1].trim() : domain,
        description: descMatch ? descMatch[1].trim() : undefined,
        image: imgMatch ? imgMatch[1].trim() : null,
        thumbnail_url: imgMatch ? imgMatch[1].trim() : undefined,
        site_name: domain,
      };
    } catch {
      return null;
    }
  }
}

