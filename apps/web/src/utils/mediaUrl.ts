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
  if (url.startsWith('/api')) {
    const apiBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
      : import.meta.env.PROD
      ? 'https://api-oomfy.onrender.com'
      : '';
    return `${apiBase}${url}`;
  }
  return url;
}

