import { Environment } from './Environment.js';

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true;
  if (Environment.ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    const isProdOrigin = parsed.protocol === 'https:' && (host === 'oomfy.online' || host.endsWith('.oomfy.online'));
    if (isProdOrigin) return true;
    if (!Environment.isProduction() && (host === 'localhost' || host === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

export function corsOriginHandler(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  callback(null, isOriginAllowed(origin));
}
