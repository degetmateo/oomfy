export class UrlHelper {
  public static isSafeHttpUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr.trim(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }

  public static isInternalUrl(urlStr: string | null | undefined): boolean {
    if (!urlStr) return false;
    const trimmed = urlStr.trim();
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;

    try {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
      const u = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      const host = u.hostname.toLowerCase();

      if (currentHost && (host === currentHost || host.endsWith(`.${currentHost}`))) {
        return true;
      }

      return (
        host === 'oomfy.online' ||
        host.endsWith('.oomfy.online') ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'onrender.com' ||
        host.endsWith('.onrender.com')
      );
    } catch {
      return false;
    }
  }

  public static getInternalPath(urlStr: string): string {
    try {
      const u = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return u.pathname + u.search + u.hash;
    } catch {
      return urlStr;
    }
  }
}

