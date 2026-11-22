import { GenericEmbed } from '@oomfy/shared';
import { toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText, stripHtml } from './OpenGraphParser.js';
import { TikTokEmbedAdapter } from './TikTokEmbedAdapter.js';

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    let candidate = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      candidate = u.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') candidate = u.searchParams.get('v') || '';
      else candidate = u.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1] || '';
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch { return null; }
}

function parseTwitterStatus(rawUrl: string): { user?: string; tweetId: string } | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host !== 'twitter.com' && !host.endsWith('.twitter.com') && host !== 'x.com' && !host.endsWith('.x.com')) return null;
    const match = u.pathname.match(/^\/(?:([a-zA-Z0-9_]+)|i\/web)\/status\/(\d+)/i);
    return match ? { user: match[1] || 'i', tweetId: match[2] } : null;
  } catch { return null; }
}

export class SocialOEmbedAdapter {
  public static async fetchTwitter(url: string): Promise<GenericEmbed | null> {
    const parsed = parseTwitterStatus(url);
    if (!parsed) return null;
    const user = parsed.user || 'i';
    try {
      const res = await fetch(`https://api.fxtwitter.com/${user}/status/${parsed.tweetId}`, {
        signal: AbortSignal.timeout(3500), headers: { 'User-Agent': 'oomfy-bot/1.0' },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.tweet) {
          const photo = toSafeHttpsAssetUrl(data.tweet.media?.photos?.[0]?.url);
          const avatar = toSafeHttpsAssetUrl(data.tweet.author?.avatar_url);
          return {
            type: 'twitter', url, site_name: 'Twitter / X',
            title: clampText(data.tweet.author?.name || `@${data.tweet.author?.screen_name}`, 120),
            description: clampText(data.tweet.text || '', 400),
            author_name: clampText(data.tweet.author?.name, 100),
            author_username: clampText(data.tweet.author?.screen_name, 50),
            avatar_url: avatar, thumbnail_url: (photo || avatar) || undefined, image: photo,
          };
        }
      }
    } catch { /* fallback to publish.twitter.com */ }

    try {
      const oembedRes = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`, {
        signal: AbortSignal.timeout(3500),
      });
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as any;
        const handleMatch = typeof data.author_url === 'string' ? data.author_url.match(/\/([a-zA-Z0-9_]+)\/?$/) : null;
        return {
          type: 'twitter', url, site_name: 'Twitter / X',
          title: clampText(data.author_name || 'Twitter / X', 120),
          description: stripHtml(data.html, 400),
          author_name: clampText(data.author_name, 100),
          author_username: clampText(handleMatch?.[1] || (user !== 'i' ? user : undefined), 50),
        };
      }
    } catch { /* fallback minimal card */ }

    return {
      type: 'twitter', url, site_name: 'Twitter / X',
      title: user !== 'i' ? `Publicación de @${user}` : 'Publicación en X',
      author_username: user !== 'i' ? user : undefined,
    };
  }

  public static async fetchTikTok(url: string): Promise<GenericEmbed | null> {
    return TikTokEmbedAdapter.fetchTikTok(url);
  }

  public static async fetchYouTube(url: string): Promise<GenericEmbed | null> {
    const videoId = extractYouTubeVideoId(url);
    const iframeUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : undefined;
    const fallbackThumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = (await res.json()) as any;
        const thumb = toSafeHttpsAssetUrl(data.thumbnail_url) || fallbackThumb;
        return {
          type: 'youtube', url, site_name: 'YouTube', video_id: videoId || undefined, iframe_url: iframeUrl,
          title: clampText(data.title, 200),
          description: clampText(`Video de YouTube por ${data.author_name || 'YouTube'}`, 200),
          author_name: clampText(data.author_name, 100),
          thumbnail_url: thumb || undefined, image: thumb,
        };
      }
    } catch { /* use fallback if videoId extracted */ }
    if (!videoId) return null;
    return {
      type: 'youtube', url, site_name: 'YouTube', video_id: videoId, iframe_url: iframeUrl,
      title: 'Video de YouTube', thumbnail_url: fallbackThumb || undefined, image: fallbackThumb,
    };
  }
}
