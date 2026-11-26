import { WikipediaEmbed } from '@oomfy/shared';
import { safeFetchPublicHtml, toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';
import { clampText, OpenGraphParser } from './OpenGraphParser.js';

const WIKIPEDIA_HOST_RE = /^([a-z]{2,12}(?:-[a-z]{2,12})*)(?:\.m)?\.wikipedia\.org$/i;
const WIKIPEDIA_PATH_RE = /^\/wiki\/([^#?]+)$/i;
const IGNORED_NAMESPACES = new Set([
  'special', 'especial', 'file', 'archivo', 'image', 'imagen',
  'template', 'plantilla', 'talk', 'discusión', 'user', 'usuario',
  'help', 'ayuda', 'mediawiki', 'category', 'categoría', 'portal',
  'module', 'módulo', 'draft', 'wikipedia',
]);

function parseWikipediaArticle(rawUrl: string): { lang: string; title: string } | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const hostMatch = parsed.hostname.toLowerCase().match(WIKIPEDIA_HOST_RE);
    const pathMatch = parsed.pathname.match(WIKIPEDIA_PATH_RE);
    if (!hostMatch || !pathMatch) return null;

    const lang = hostMatch[1].toLowerCase();
    const rawTitle = decodeURIComponent(pathMatch[1]).trim();
    if (!rawTitle) return null;

    const colonIdx = rawTitle.indexOf(':');
    if (colonIdx > 0) {
      const prefix = rawTitle.slice(0, colonIdx).replace(/_/g, ' ').trim().toLowerCase();
      if (IGNORED_NAMESPACES.has(prefix)) return null;
    }
    return { lang, title: rawTitle };
  } catch {
    return null;
  }
}

async function fallbackWikipediaOg(url: string, lang: string): Promise<WikipediaEmbed | null> {
  const html = await safeFetchPublicHtml(url);
  if (!html) return null;
  const og = OpenGraphParser.parse(html, url);
  return {
    type: 'wikipedia',
    url,
    title: og.title || 'Wikipedia',
    description: og.description,
    image: og.image,
    thumbnail_url: og.image || undefined,
    site_name: 'Wikipedia',
    language: lang,
  };
}

export class WikipediaEmbedAdapter {
  public static async fetchArticle(url: string): Promise<WikipediaEmbed | null> {
    const target = parseWikipediaArticle(url);
    if (!target) return null;

    const summaryEndpoint = `https://${target.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(target.title)}`;
    try {
      const res = await fetch(summaryEndpoint, {
        signal: AbortSignal.timeout(3500),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'oomfy-bot/1.0 (+https://oomfy.online)',
        },
      });
      if (!res.ok) return fallbackWikipediaOg(url, target.lang);
      const data = (await res.json()) as any;
      if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
        return null;
      }

      const title = clampText(data.titles?.normalized || data.title, 200) || 'Wikipedia';
      const articleDescription = clampText(data.description, 140);
      const description = clampText(data.extract, 400);
      const thumb = toSafeHttpsAssetUrl(data.thumbnail?.source || data.originalimage?.source);

      return {
        type: 'wikipedia',
        url,
        title,
        ...(articleDescription ? { article_description: articleDescription } : {}),
        description,
        thumbnail_url: thumb || undefined,
        image: thumb,
        site_name: 'Wikipedia',
        language: target.lang,
      };
    } catch {
      return fallbackWikipediaOg(url, target.lang);
    }
  }
}
