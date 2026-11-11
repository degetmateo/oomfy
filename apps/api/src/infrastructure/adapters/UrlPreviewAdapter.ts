import { Environment } from '../../config/Environment.js';
import { SpotifyEmbedAdapter } from './SpotifyEmbedAdapter.js';
import { SocialOEmbedAdapter } from './SocialOEmbedAdapter.js';
import { MongoPublicationRepository } from '../repositories/mongo/MongoPublicationRepository.js';
import { safeFetchPublicHtml } from '../../utils/UrlSecurityHelper.js';

export interface LinkPreview {
  type: 'spotify' | 'twitter' | 'tiktok' | 'youtube' | 'link' | 'quote';
  url: string;
  title?: string;
  description?: string;
  author_name?: string;
  author_username?: string;
  thumbnail_url?: string;
  iframe_url?: string;
  image?: string | null;
  site_name?: string;
  target_publication?: any;
}

const matchesDomain = (host: string, base: string) => host === base || host.endsWith(`.${base}`);

export class UrlPreviewAdapter {
  public static extractFirstUrl(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  public static async getPreview(url: string): Promise<LinkPreview | null> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      const host = parsed.hostname.toLowerCase();

      if (host === 'open.spotify.com') {
        const spotify = await SpotifyEmbedAdapter.fetchEmbed(url);
        return {
          type: 'spotify',
          url,
          title: spotify.title,
          iframe_url: spotify.iframe_url,
          image: spotify.thumbnail_url,
          thumbnail_url: spotify.thumbnail_url,
          site_name: 'Spotify',
        };
      }

      if ((matchesDomain(host, 'twitter.com') || matchesDomain(host, 'x.com')) && /\/status\//i.test(parsed.pathname)) {
        const twitter = await SocialOEmbedAdapter.fetchTwitter(url);
        if (twitter) return twitter;
      }

      if (matchesDomain(host, 'tiktok.com')) {
        const tiktok = await SocialOEmbedAdapter.fetchTikTok(url);
        if (tiktok) return tiktok;
      }

      if (matchesDomain(host, 'youtube.com') || host === 'youtu.be') {
        const yt = await SocialOEmbedAdapter.fetchYouTube(url);
        if (yt) return yt;
      }

      const isOomfyHost = matchesDomain(host, 'oomfy.online') || (!Environment.isProduction() && (host === 'localhost' || host === '127.0.0.1'));
      const internalMatch = isOomfyHost ? parsed.pathname.match(/^\/(?:publication|post)\/([a-zA-Z0-9_-]+)/i) : null;
      if (internalMatch) {
        const pub = await MongoPublicationRepository.findById(internalMatch[1]);
        if (pub) {
          return { type: 'quote', url, title: `${pub.author.name} (@${pub.author.username})`, description: pub.content || 'Publicación en oomfy', target_publication: pub };
        }
      }

      const html = await safeFetchPublicHtml(url);
      if (!html) return null;
      const titleMatch = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i) || html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta property=["']og:description["'] content=["'](.*?)["']/i) || html.match(/<meta name=["']description["'] content=["'](.*?)["']/i);
      const imgMatch = html.match(/<meta property=["']og:image["'] content=["'](.*?)["']/i);

      return {
        type: 'link',
        url,
        title: titleMatch ? titleMatch[1].trim() : host,
        description: descMatch ? descMatch[1].trim() : undefined,
        image: imgMatch ? imgMatch[1].trim() : null,
        thumbnail_url: imgMatch ? imgMatch[1].trim() : undefined,
        site_name: host,
      };
    } catch {
      return null;
    }
  }
}
