import { normalizeProfileLink } from '@oomfy/shared';

interface OriginLike {
  readonly opaque?: boolean;
  isSameSite(other: OriginLike): boolean;
}

interface OriginConstructorLike {
  from(value: unknown): OriginLike;
}

function getOriginApi(): OriginConstructorLike | null {
  if (!('Origin' in globalThis)) return null;
  const ctor = (globalThis as { Origin?: OriginConstructorLike }).Origin;
  return ctor && typeof ctor.from === 'function' ? ctor : null;
}

export class UrlHelper {
  public static normalizeProfileLink(urlStr: string | null | undefined): string | null {
    return normalizeProfileLink(urlStr);
  }

  public static isSafeHttpUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr.trim(), typeof window !== 'undefined' ? window.location.origin : 'https://oomfy.online');
      return u.origin !== 'null' && (u.protocol === 'https:' || u.protocol === 'http:');
    } catch {
      return false;
    }
  }

  public static isSafeSpotifyEmbedUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr.trim());
      return u.protocol === 'https:' && u.hostname.toLowerCase() === 'open.spotify.com' && u.pathname.startsWith('/embed/');
    } catch {
      return false;
    }
  }

  public static isSafeYouTubeEmbedUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr.trim());
      return u.protocol === 'https:' && u.hostname.toLowerCase() === 'www.youtube-nocookie.com' && /^\/embed\/[a-zA-Z0-9_-]{11}$/.test(u.pathname);
    } catch {
      return false;
    }
  }

  public static decodeParamSafe(raw: string): string {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  public static isInternalUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    const trimmed = urlStr.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('\\') || /^\/\\/.test(trimmed)) return false;
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;

    try {
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://oomfy.online';
      const u = new URL(trimmed, baseOrigin);
      if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.origin === 'null') return false;
      const host = u.hostname.toLowerCase();

      if (host === 'localhost' || host === '127.0.0.1') return true;

      const OriginApi = getOriginApi();
      if (OriginApi) {
        try {
          const targetOrigin = OriginApi.from(u);
          if (targetOrigin.opaque) return false;
          if (
            targetOrigin.isSameSite(OriginApi.from('https://oomfy.online')) ||
            targetOrigin.isSameSite(OriginApi.from('http://oomfy.online'))
          ) {
            return true;
          }
          if (typeof window !== 'undefined') {
            try {
              if (targetOrigin.isSameSite(OriginApi.from(globalThis))) return true;
            } catch { /* ignore opaque or unavailable current context origin */ }
          }
          return false;
        } catch {
          return false;
        }
      }

      const currentHost = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
      if (currentHost && (host === currentHost || (currentHost === 'oomfy.online' && host.endsWith('.oomfy.online')))) {
        return true;
      }

      return host === 'oomfy.online' || host.endsWith('.oomfy.online');
    } catch {
      return false;
    }
  }

  public static getInternalPath(urlStr: string): string {
    try {
      const u = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'https://oomfy.online');
      return u.pathname + u.search + u.hash;
    } catch {
      return urlStr;
    }
  }
}
