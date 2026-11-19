import { PublicUser } from '@oomfy/shared';

const SYNC_FIELDS = ['name', 'username', 'role', 'icon_url', 'banner_url'] as const;

export function normalizeUserCounters(u: PublicUser): PublicUser {
  return {
    ...u,
    follower_count: Math.max(0, u.follower_count || 0),
    followed_count: Math.max(0, u.followed_count || 0),
    publication_count: Math.max(0, u.publication_count || 0),
  };
}

export function mergeUserDefined(prev: PublicUser | undefined, incoming: Partial<PublicUser>): PublicUser {
  if (!prev) return normalizeUserCounters(incoming as PublicUser);
  const merged: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== undefined) merged[k] = v;
  }
  return normalizeUserCounters(merged as unknown as PublicUser);
}

export function hasVisualUserChange(prev: PublicUser | undefined, next: PublicUser): boolean {
  if (!prev) return false;
  return SYNC_FIELDS.some((f) => prev[f] !== next[f]);
}
