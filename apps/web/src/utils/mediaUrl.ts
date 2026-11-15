import { resolveApiBaseUrl } from './apiBase.js';

function upgradeToHttps(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return rawUrl;
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://')) return upgradeToHttps(trimmed);
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/members/') || trimmed.startsWith('/api')) {
    return `${resolveApiBaseUrl(false)}${trimmed}`;
  }
  return trimmed;
}

