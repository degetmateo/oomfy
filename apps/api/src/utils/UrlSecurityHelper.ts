import dns from 'dns/promises';
import net from 'net';

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (clean.startsWith('::ffff:')) {
    const v4 = clean.slice(7);
    if (net.isIPv4(v4)) return isPrivateIpv4(v4);
    const hexParts = v4.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        return isPrivateIpv4(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
      }
    }
    return true;
  }
  if (net.isIPv4(clean)) return isPrivateIpv4(clean);
  if (!net.isIPv6(clean)) return true;
  return (
    clean === '::' ||
    clean === '::1' ||
    clean.startsWith('0:') ||
    clean.startsWith('fc') ||
    clean.startsWith('fd') ||
    clean.startsWith('fe8') ||
    clean.startsWith('fe9') ||
    clean.startsWith('fea') ||
    clean.startsWith('feb') ||
    clean.startsWith('ff') ||
    clean.startsWith('2001:db8:') ||
    clean.startsWith('2001:0db8:')
  );
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
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
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
    return (await res.text()).slice(0, 512 * 1024);
  }
  return null;
}
