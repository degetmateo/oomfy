import dns from 'dns/promises';
import net from 'net';

function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip.toLowerCase();
  if (net.isIPv4(clean)) {
    const [a, b] = clean.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return clean === '::' || clean === '::1' || clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80');
}

export function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function isSafePublicHttpUrl(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
    if (net.isIP(host)) return isPrivateOrReservedIp(host) ? null : parsed;
    const records = await dns.lookup(host, { all: true });
    if (!records.length || records.some((r) => isPrivateOrReservedIp(r.address))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function safeFetchPublicHtml(rawUrl: string): Promise<string | null> {
  let current = rawUrl;
  for (let hop = 0; hop < 3; hop++) {
    const valid = await isSafePublicHttpUrl(current);
    if (!valid) return null;
    const res = await fetch(valid.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(3500),
      headers: { 'User-Agent': 'oomfy-bot/1.0 (+https://oomfy.online)' },
    });
    if (res.status >= 300 && res.status < 400) {
      const nextLoc = res.headers.get('location');
      if (!nextLoc) return null;
      current = new URL(nextLoc, valid).toString();
      continue;
    }
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null;
    const text = await res.text();
    return text.slice(0, 512 * 1024);
  }
  return null;
}
