import { API_PROD_URL } from '@oomfy/shared';

export function resolveApiBaseUrl(requireOomfyHost = true): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (!import.meta.env.PROD) return '';
  if (!requireOomfyHost) return API_PROD_URL;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname.toLowerCase();
    if (h === 'oomfy.online' || h.endsWith('.oomfy.online')) return API_PROD_URL;
  }
  return '';
}

export function getSocketBaseUrl(): string | undefined {
  return resolveApiBaseUrl(true) || undefined;
}
