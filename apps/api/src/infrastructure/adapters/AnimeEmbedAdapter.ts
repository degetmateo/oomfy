import { AnimeEmbed } from '@oomfy/shared';
import { safeFetchPublicHtml, toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText, OpenGraphParser, stripHtml } from './OpenGraphParser.js';

const ANILIST_QUERY = `
query ($id: Int, $type: MediaType) {
  Media(id: $id, type: $type) {
    title { romaji english native }
    format
    status
    episodes
    chapters
    averageScore
    seasonYear
    genres
    description(asHtml: false)
    coverImage { large }
    bannerImage
  }
}`;

function parseAnimeRoute(rawUrl: string, domain: string): { kind: 'anime' | 'manga'; id: number } | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host !== domain && !host.endsWith(`.${domain}`)) return null;
    const match = u.pathname.match(/^\/(anime|manga)\/(\d{1,9})(?:\/|$)/i);
    if (!match) return null;
    return { kind: match[1].toLowerCase() as 'anime' | 'manga', id: Number(match[2]) };
  } catch { return null; }
}

async function fallbackOg(url: string, type: 'anilist' | 'myanimelist', mediaType?: 'anime' | 'manga'): Promise<AnimeEmbed | null> {
  const html = await safeFetchPublicHtml(url);
  if (!html) return null;
  const og = OpenGraphParser.parse(html, url);
  return {
    type, url, media_type: mediaType,
    title: og.title || (type === 'anilist' ? 'AniList' : 'MyAnimeList'),
    description: og.description,
    image: og.image,
    thumbnail_url: og.image || undefined,
    site_name: type === 'anilist' ? 'AniList' : 'MyAnimeList',
  };
}

export class AnimeEmbedAdapter {
  public static async fetchAniList(url: string): Promise<AnimeEmbed | null> {
    const target = parseAnimeRoute(url, 'anilist.co');
    if (!target) return null;
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: AbortSignal.timeout(3500),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { id: target.id, type: target.kind.toUpperCase() } }),
      });
      if (!res.ok) return fallbackOg(url, 'anilist', target.kind);
      const json = (await res.json()) as any;
      const media = json?.data?.Media;
      if (!media) return fallbackOg(url, 'anilist', target.kind);
      const thumb = toSafeHttpsAssetUrl(media.coverImage?.large || media.bannerImage);
      return {
        type: 'anilist', url, site_name: 'AniList', media_type: target.kind,
        title: clampText(media.title?.english || media.title?.romaji || media.title?.native, 200) || 'AniList',
        description: stripHtml(media.description, 400),
        thumbnail_url: thumb || undefined, image: thumb,
        media_format: clampText(media.format, 30), status: clampText(media.status, 30),
        score: typeof media.averageScore === 'number' ? Math.round((media.averageScore / 10) * 10) / 10 : null,
        episodes: typeof media.episodes === 'number' ? media.episodes : null,
        chapters: typeof media.chapters === 'number' ? media.chapters : null,
        season_year: typeof media.seasonYear === 'number' ? media.seasonYear : null,
        genres: Array.isArray(media.genres) ? media.genres.map((g: unknown) => clampText(String(g), 30)).filter(Boolean).slice(0, 5) as string[] : [],
      };
    } catch { return fallbackOg(url, 'anilist', target.kind); }
  }

  public static async fetchMyAnimeList(url: string): Promise<AnimeEmbed | null> {
    const target = parseAnimeRoute(url, 'myanimelist.net');
    if (!target) return null;
    try {
      const res = await fetch(`https://api.jikan.moe/v4/${target.kind}/${target.id}`, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: 'application/json', 'User-Agent': 'oomfy-bot/1.0' },
      });
      if (!res.ok) return fallbackOg(url, 'myanimelist', target.kind);
      const json = (await res.json()) as any;
      const data = json?.data;
      if (!data) return fallbackOg(url, 'myanimelist', target.kind);
      const thumb = toSafeHttpsAssetUrl(data.images?.jpg?.large_image_url || data.images?.jpg?.image_url);
      return {
        type: 'myanimelist', url, site_name: 'MyAnimeList', media_type: target.kind,
        title: clampText(data.title_english || data.title, 200) || 'MyAnimeList',
        description: clampText(data.synopsis, 400),
        thumbnail_url: thumb || undefined, image: thumb,
        media_format: clampText(data.type, 30), status: clampText(data.status, 30),
        score: typeof data.score === 'number' ? data.score : null,
        episodes: typeof data.episodes === 'number' ? data.episodes : null,
        chapters: typeof data.chapters === 'number' ? data.chapters : null,
        season_year: typeof data.year === 'number' ? data.year : null,
        genres: Array.isArray(data.genres) ? data.genres.map((g: any) => clampText(g?.name, 30)).filter(Boolean).slice(0, 5) as string[] : [],
      };
    } catch { return fallbackOg(url, 'myanimelist', target.kind); }
  }
}
