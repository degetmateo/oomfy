import { z } from 'zod';

export function isHttpUrlString(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidIpv4Host(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isValidProfileHostname(host: string): boolean {
  if (!host || host.startsWith('.') || host.endsWith('.') || host.includes('..')) return false;
  if (host === 'localhost' || isValidIpv4Host(host) || /^\[[0-9a-f:]+\]$/i.test(host)) return true;

  const labels = host.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return false;

  const tld = labels[labels.length - 1];
  return /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld);
}

/**
 * Normalizes any user-entered profile link (bare domain, www., http://, https://)
 * into a safe HTTP(S) URL string, or returns null when the input is invalid/unsafe.
 */
export function normalizeProfileLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /[\s\u0000-\u001F\u007F]/.test(trimmed)) return null;

  let candidate: string;
  if (trimmed.startsWith('//')) {
    candidate = `https://${trimmed.slice(2)}`;
  } else {
    const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/);
    if (schemeMatch) {
      const scheme = schemeMatch[1].toLowerCase();
      const rest = schemeMatch[2];
      if (scheme === 'http' || scheme === 'https') {
        if (rest.startsWith('//')) candidate = trimmed;
        else if (rest.length > 0 && !rest.startsWith('/')) candidate = `${scheme}://${rest}`;
        else return null;
      } else if (/^\d{1,5}(?:[/?#]|$)/.test(rest)) {
        candidate = `https://${trimmed}`;
      } else {
        return null;
      }
    } else {
      candidate = `https://${trimmed}`;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.origin === 'null' || parsed.username || parsed.password) return null;
    if (!isValidProfileHostname(parsed.hostname.toLowerCase())) return null;

    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) return parsed.origin;
    return parsed.href;
  } catch {
    return null;
  }
}

export function isHttpsUrlString(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const httpUrlSchema = (message = 'La URL debe usar protocolo http o https.') =>
  z.string().trim().refine(isHttpUrlString, { error: message });

export const httpsUrlSchema = (message = 'La URL debe usar protocolo HTTPS.') =>
  z.string().trim().refine(isHttpsUrlString, { error: message });

export const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const safeEntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, { error: 'Identificador inválido.' });

