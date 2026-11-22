import { GenericEmbed } from '@oomfy/shared';
import { isSafePublicHttpUrl, safeFetchPublicHtml, toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText, OpenGraphParser } from './OpenGraphParser.js';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const isTikTokHost = (h: string) => h === 'tiktok.com' || h.endsWith('.tiktok.com');
const isShortHost = (h: string) => h === 'vm.tiktok.com' || h === 'vt.tiktok.com';

interface TikTokTarget { url: string; handle?: string; itemId?: string; isPhoto?: boolean; }

function parseTikTokTarget(rawUrl: string): TikTokTarget {
  try {
    const u = new URL(rawUrl);
    const full = u.pathname.match(/^\/@([a-zA-Z0-9._-]+)\/(video|photo)\/(\d+)/i);
    if (full) {
      const clean = `https://www.tiktok.com/@${full[1]}/${full[2].toLowerCase()}/${full[3]}`;
      return { url: clean, handle: full[1], itemId: full[3], isPhoto: full[2].toLowerCase() === 'photo' };
    }
    const vMatch = u.pathname.match(/^\/v\/(\d+)/i);
    if (vMatch) return { url: `https://www.tiktok.com/v/${vMatch[1]}`, itemId: vMatch[1] };
    return { url: rawUrl };
  } catch { return { url: rawUrl }; }
}

async function resolveCanonicalTikTokUrl(rawUrl: string): Promise<string> {
  let current = rawUrl;
  try {
    const initial = new URL(rawUrl);
    const h = initial.hostname.toLowerCase();
    if (!isShortHost(h) && !initial.pathname.startsWith('/t/')) return rawUrl;
    for (let hop = 0; hop < 4; hop++) {
      const safe = await isSafePublicHttpUrl(current);
      if (!safe || !isTikTokHost(safe.hostname.toLowerCase())) break;
      const res = await fetch(safe.toString(), {
        redirect: 'manual', signal: AbortSignal.timeout(2200),
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*;q=0.8' },
      });
      if (res.status >= 300 && res.status < 400) {
        const nextLoc = res.headers.get('location');
        if (!nextLoc) break;
        const resolved = new URL(nextLoc, safe);
        if (!isTikTokHost(resolved.hostname.toLowerCase())) break;
        current = resolved.toString();
        continue;
      }
      break;
    }
  } catch { /* keep last known url */ }
  return current;
}

function parseRehydrationHtml(html: string): Partial<GenericEmbed> | null {
  const m = html.match(/<script[^>]*id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try {
    const json = JSON.parse(m[1]);
    const item = json?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!item) return null;
    const handle = clampText(item.author?.uniqueId, 50);
    const authorName = clampText(item.author?.nickname || item.author?.uniqueId, 100);
    const cover = toSafeHttpsAssetUrl(
      item.video?.cover || item.video?.originCover || item.imagePost?.images?.[0]?.imageURL?.urlList?.[0]
    );
    return {
      title: clampText(item.desc, 200),
      author_name: authorName,
      author_username: handle,
      thumbnail_url: cover || undefined,
      image: cover,
    };
  } catch { return null; }
}

async function fetchTikTokOEmbed(oembedUrl: string): Promise<Partial<GenericEmbed> | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(oembedUrl)}`, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data || data.code || data.status_msg) return null;
    const thumb = toSafeHttpsAssetUrl(data.thumbnail_url);
    const authorName = clampText(data.author_name, 100);
    const title = clampText(data.title, 200);
    if (!title && !authorName && !thumb) return null;
    const urlHandle = typeof data.author_url === 'string' ? data.author_url.match(/\/@([a-zA-Z0-9._-]+)/)?.[1] : undefined;
    return {
      title, author_name: authorName,
      author_username: clampText(data.author_unique_id || urlHandle, 50),
      thumbnail_url: thumb || undefined, image: thumb,
    };
  } catch { return null; }
}

async function fetchTikWm(canonicalUrl: string): Promise<Partial<GenericEmbed> | null> {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(canonicalUrl)}`, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const d = json?.code === 0 ? json?.data : null;
    if (!d) return null;
    const thumb = toSafeHttpsAssetUrl(d.cover || d.origin_cover || d.ai_dynamic_cover || d.images?.[0]);
    const avatar = toSafeHttpsAssetUrl(d.author?.avatar);
    return {
      title: clampText(d.title, 200),
      author_name: clampText(d.author?.nickname || d.author?.unique_id, 100),
      author_username: clampText(d.author?.unique_id, 50),
      thumbnail_url: thumb || undefined, image: thumb, avatar_url: avatar,
    };
  } catch { return null; }
}

export class TikTokEmbedAdapter {
  public static async fetchTikTok(rawUrl: string): Promise<GenericEmbed | null> {
    const expanded = await resolveCanonicalTikTokUrl(rawUrl);
    const target = parseTikTokTarget(expanded);
    const oembedUrl = target.isPhoto && target.handle && target.itemId
      ? `https://www.tiktok.com/@${target.handle}/video/${target.itemId}` : target.url;

    const oembed = await fetchTikTokOEmbed(oembedUrl);
    const needFallback = !oembed || !oembed.thumbnail_url || !oembed.author_name;
    const tikwm = needFallback ? await fetchTikWm(target.url) : null;

    let htmlMeta: Partial<GenericEmbed> | null = null;
    if ((!oembed?.thumbnail_url && !tikwm?.thumbnail_url) || (!oembed?.title && !tikwm?.title)) {
      const html = await safeFetchPublicHtml(target.url);
      if (html) {
        htmlMeta = parseRehydrationHtml(html);
        if (!htmlMeta?.thumbnail_url) {
          const og = OpenGraphParser.parse(html, target.url);
          const isPlaceholder = og.title?.toLowerCase().includes('make your day') && !og.image;
          if (!isPlaceholder && (og.title || og.image)) {
            htmlMeta = { title: og.title, description: og.description, thumbnail_url: og.image || undefined, image: og.image };
          }
        }
      }
    }

    const handle = oembed?.author_username || tikwm?.author_username || htmlMeta?.author_username || target.handle;
    const authorName = oembed?.author_name || tikwm?.author_name || htmlMeta?.author_name || (handle ? `@${handle}` : undefined);
    const thumb = oembed?.thumbnail_url || tikwm?.thumbnail_url || htmlMeta?.thumbnail_url;
    const title = oembed?.title || tikwm?.title || htmlMeta?.title || (handle ? `TikTok de @${handle}` : 'Publicación de TikTok');
    const description = htmlMeta?.description || (authorName && authorName !== title ? `TikTok por ${authorName}` : 'Ver publicación en TikTok');

    return {
      type: 'tiktok', url: target.url, site_name: 'TikTok', title, description: clampText(description, 200),
      author_name: authorName, author_username: handle,
      thumbnail_url: thumb, image: thumb || null, avatar_url: tikwm?.avatar_url || null,
    };
  }
}
