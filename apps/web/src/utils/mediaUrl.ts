import { resolveApiBaseUrl } from './apiBase';

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  if (url.startsWith('/members/') || url.startsWith('/api')) {
    return `${resolveApiBaseUrl(false)}${url}`;
  }
  return url;
}

