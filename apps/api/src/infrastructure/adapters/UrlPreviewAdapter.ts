import { PublicationEmbed } from '@oomfy/shared';
import { Environment } from '../../config/Environment.js';
import { SpotifyEmbedAdapter } from './SpotifyEmbedAdapter.js';
import { SocialOEmbedAdapter } from './SocialOEmbedAdapter.js';
import { TikTokEmbedAdapter } from './TikTokEmbedAdapter.js';
import { AnimeEmbedAdapter } from './AnimeEmbedAdapter.js';
import { WikipediaEmbedAdapter } from './WikipediaEmbedAdapter.js';
import { OpenGraphParser } from './OpenGraphParser.js';
import { UrlExtractor } from './UrlExtractor.js';
import { MongoPublicationRepository } from '../repositories/mongo/MongoPublicationRepository.js';
import { safeFetchPublicHtml } from '../../utils/UrlSecurityHelper.js';

export type LinkPreview = PublicationEmbed | {
  type: 'quote';
  url: string;
  title?: string;
  description?: string;
  target_publication?: any;
};

const matchesDomain = (host: string, base: string) => host === base || host.endsWith(`.${base}`);

function withTimeoutBudget<T>(promise: Promise<T | null>, budgetMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), budgetMs);
    promise.then((val) => { clearTimeout(timer); resolve(val); }).catch(() => { clearTimeout(timer); resolve(null); });
  });
}

export class UrlPreviewAdapter {
  public static extractFirstUrl(text: string): string | null {
    return UrlExtractor.extract(text, 1)[0] ?? null;
  }

  public static extractUrls(text: string, max = 4): string[] {
    return UrlExtractor.extract(text, max);
  }

  public static async getPreviews(urls: string[], budgetMs = 6000): Promise<LinkPreview[]> {
    if (!urls.length) return [];
    const results = await Promise.allSettled(urls.slice(0, 4).map((u) => withTimeoutBudget(this.getPreview(u), budgetMs)));
    return results
      .filter((r): r is PromiseFulfilledResult<LinkPreview | null> => r.status === 'fulfilled' && Boolean(r.value))
      .map((r) => r.value as LinkPreview);
  }

  public static async getPreview(url: string): Promise<LinkPreview | null> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      const host = parsed.hostname.toLowerCase();

      if (host === 'open.spotify.com') return await SpotifyEmbedAdapter.fetchEmbed(url);
      if ((matchesDomain(host, 'twitter.com') || matchesDomain(host, 'x.com')) && /\/status\//i.test(parsed.pathname)) {
        const twitter = await SocialOEmbedAdapter.fetchTwitter(url);
        if (twitter) return twitter;
      }
      if (matchesDomain(host, 'tiktok.com')) {
        const tiktok = await TikTokEmbedAdapter.fetchTikTok(url);
        if (tiktok) return tiktok;
      }
      if (matchesDomain(host, 'youtube.com') || host === 'youtu.be') {
        const yt = await SocialOEmbedAdapter.fetchYouTube(url);
        if (yt) return yt;
      }
      if (matchesDomain(host, 'anilist.co')) {
        const anilist = await AnimeEmbedAdapter.fetchAniList(url);
        if (anilist) return anilist;
      }
      if (matchesDomain(host, 'myanimelist.net')) {
        const mal = await AnimeEmbedAdapter.fetchMyAnimeList(url);
        if (mal) return mal;
      }
      if (matchesDomain(host, 'wikipedia.org')) {
        const wiki = await WikipediaEmbedAdapter.fetchArticle(url);
        if (wiki) return wiki;
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
      const og = OpenGraphParser.parse(html, url);
      return {
        type: 'link', url, title: og.title || host, description: og.description,
        image: og.image, thumbnail_url: og.image || undefined, site_name: og.site_name || host,
      };
    } catch { return null; }
  }
}
