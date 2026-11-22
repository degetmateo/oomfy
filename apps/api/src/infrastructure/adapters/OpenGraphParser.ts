import { toSafeHttpsAssetUrl } from '../../utils/UrlSecurityHelper.js';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ',
};

export interface ParsedOpenGraph {
  title?: string;
  description?: string;
  image: string | null;
  site_name?: string;
}

export function clampText(raw?: string | null, maxLen = 200): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1).trimEnd()}…` : normalized;
}

export function decodeHtmlEntities(raw: string): string {
  return raw.replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/g, (full, ent: string) => {
    const low = ent.toLowerCase();
    if (NAMED_ENTITIES[low] !== undefined) return NAMED_ENTITIES[low];
    const cp = low.startsWith('#x') ? parseInt(low.slice(2), 16) : parseInt(low.slice(1), 10);
    if (!Number.isFinite(cp) || cp < 0x20 || cp > 0x10ffff) return full;
    try { return String.fromCodePoint(cp); } catch { return full; }
  });
}

export function stripHtml(raw?: string | null, maxLen = 400): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const text = decodeHtmlEntities(
    raw.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|div|li|blockquote)>/gi, ' ').replace(/<[^>]*>/g, ' ')
  );
  return clampText(text, maxLen);
}

function parseMetaAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(tag)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

export class OpenGraphParser {
  public static parse(html: string, baseUrl: string): ParsedOpenGraph {
    const meta = new Map<string, string>();
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metaTags) {
      const attrs = parseMetaAttributes(tag);
      const key = (attrs.property || attrs.name || '').trim().toLowerCase();
      const val = attrs.content?.trim();
      if (key && val && !meta.has(key)) meta.set(key, decodeHtmlEntities(val));
    }

    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleTag = titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]) : undefined;
    const rawImg = meta.get('og:image:secure_url') || meta.get('og:image') || meta.get('twitter:image');

    return {
      title: clampText(meta.get('og:title') || meta.get('twitter:title') || titleTag, 200),
      description: clampText(meta.get('og:description') || meta.get('twitter:description') || meta.get('description'), 400),
      image: rawImg ? toSafeHttpsAssetUrl(rawImg, baseUrl) : null,
      site_name: clampText(meta.get('og:site_name') || meta.get('twitter:site'), 80),
    };
  }
}
