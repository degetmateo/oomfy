import { PublicUser } from '@oomfy/shared';

const SYNC_FIELDS = ['name', 'username', 'role', 'icon_url', 'banner_url'] as const;
const VISUAL_KEYS = new Set(['name', 'icon_url', 'banner_url', 'bio', 'location', 'link', 'role']);

export function isDynamicMemberMediaUrl(url?: string | null): boolean {
  return Boolean(url && /^(\/api)?\/members\/[^/]+\/(icon|banner)$/.test(url.trim()));
}

export function normalizeUserCounters(u: PublicUser): PublicUser {
  return {
    ...u,
    follower_count: Math.max(0, u.follower_count || 0),
    followed_count: Math.max(0, u.followed_count || 0),
    publication_count: Math.max(0, u.publication_count || 0),
  };
}

export function mergeUserDefined(
  prev: PublicUser | undefined,
  incoming: Partial<PublicUser>,
  allowOverwriteVisual = true
): PublicUser {
  if (!prev) return normalizeUserCounters(incoming as PublicUser);
  const merged: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined) continue;
    if (k === 'pinned_publication') {
      if (v && typeof v === 'object') {
        merged[k] = v;
      } else if (incoming.pinned_publication_id === null) {
        merged[k] = null;
      } else if (
        incoming.pinned_publication_id !== undefined &&
        incoming.pinned_publication_id !== prev.pinned_publication_id
      ) {
        merged[k] = null;
      }
      continue;
    }
    if (!allowOverwriteVisual && VISUAL_KEYS.has(k) && prev[k as keyof PublicUser] !== undefined) continue;
    if ((k === 'icon_url' || k === 'banner_url') && isDynamicMemberMediaUrl(v as string | null) && prev[k] && !isDynamicMemberMediaUrl(prev[k])) {
      continue;
    }
    merged[k] = v;
  }
  return normalizeUserCounters(merged as unknown as PublicUser);
}

export function hasVisualUserChange(prev: PublicUser | undefined, next: PublicUser): boolean {
  if (!prev) return false;
  return SYNC_FIELDS.some((f) => prev[f] !== next[f]);
}
