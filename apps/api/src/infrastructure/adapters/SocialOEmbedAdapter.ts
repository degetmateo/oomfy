import { GenericEmbed } from '@oomfy/shared';
import { toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';

export class SocialOEmbedAdapter {
  public static async fetchTwitter(url: string): Promise<GenericEmbed | null> {
    try {
      const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i);
      if (!match) return null;
      const [, user, tweetId] = match;
      const res = await fetch(`https://api.fxtwitter.com/${user}/status/${tweetId}`, {
        signal: AbortSignal.timeout(3500),
        headers: { 'User-Agent': 'oomfy-bot/1.0' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      if (!data?.tweet) return null;
      const photo = toSafeHttpsAssetUrl(data.tweet.media?.photos?.[0]?.url);
      const thumb = photo || toSafeHttpsAssetUrl(data.tweet.author?.avatar_url) || undefined;
      return {
        type: 'twitter',
        url,
        title: data.tweet.author?.name || `@${data.tweet.author?.screen_name}`,
        description: data.tweet.text || '',
        author_name: data.tweet.author?.name,
        author_username: data.tweet.author?.screen_name,
        thumbnail_url: thumb,
        image: photo,
        site_name: 'Twitter / X',
      };
    } catch {
      return null;
    }
  }

  public static async fetchTikTok(url: string): Promise<GenericEmbed | null> {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const thumb = toSafeHttpsAssetUrl(data.thumbnail_url);
      return {
        type: 'tiktok',
        url,
        title: data.title || `Video de @${data.author_name}`,
        description: `TikTok por ${data.author_name}`,
        author_name: data.author_name,
        thumbnail_url: thumb || undefined,
        image: thumb,
        site_name: 'TikTok',
      };
    } catch {
      return null;
    }
  }

  public static async fetchYouTube(url: string): Promise<GenericEmbed | null> {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const thumb = toSafeHttpsAssetUrl(data.thumbnail_url);
      return {
        type: 'youtube',
        url,
        title: data.title,
        description: `Video de YouTube por ${data.author_name}`,
        author_name: data.author_name,
        thumbnail_url: thumb || undefined,
        image: thumb,
        site_name: 'YouTube',
      };
    } catch {
      return null;
    }
  }
}

