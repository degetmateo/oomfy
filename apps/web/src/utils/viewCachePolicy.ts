import { Role } from '@oomfy/shared';

export const PINNED_VIEW_KEYS = new Set(['/', '/explore', '/notifications', '/chats']);
export const MAX_DYNAMIC_CACHED_VIEWS = 6;

const STATIC_ROUTES = new Set([
  '/explore',
  '/notifications',
  '/chats',
  '/bookmarks',
  '/settings',
  '/admin',
  '/moderation',
  '/privacy',
  '/terms',
  '/external',
]);

function stripTrailingSlashes(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

export function normalizeViewCacheKey(pathname: string): string {
  const clean = stripTrailingSlashes(pathname);
  const lower = clean.toLowerCase();

  if (STATIC_ROUTES.has(lower)) return lower;
  if (lower.startsWith('/t/')) return lower;
  if (lower.startsWith('/publication/')) {
    const parts = clean.split('/');
    // Preserve exact case of :id while normalizing prefix/suffix
    if (parts.length === 3) return `/publication/${parts[2]}`;
    if (parts.length === 4 && parts[3].toLowerCase() === 'interactions') {
      return `/publication/${parts[2]}/interactions`;
    }
    return clean;
  }

  return lower;
}

export function normalizeScrollKey(pathname: string, search: string): string {
  return `${normalizeViewCacheKey(pathname)}${search || ''}`;
}

export function shouldCacheViewRoute(
  pathname: string,
  isAuthenticated: boolean,
  role?: Role | null
): boolean {
  const key = normalizeViewCacheKey(pathname);
  if (key === '/external') return false;

  const authOnlyStatic = new Set([
    '/explore',
    '/notifications',
    '/chats',
    '/bookmarks',
    '/settings',
  ]);
  if (authOnlyStatic.has(key) || key.startsWith('/t/')) {
    return isAuthenticated;
  }
  if (/^\/[^/]+\/(followers|following)$/.test(key)) {
    return isAuthenticated;
  }
  if (key === '/admin') {
    return Boolean(isAuthenticated && role === 'admin');
  }
  if (key === '/moderation') {
    return Boolean(isAuthenticated && (role === 'admin' || role === 'mod'));
  }

  return true;
}
