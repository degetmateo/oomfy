import { PublicUser } from '@oomfy/shared';
import { NavIconType } from '../components/icons/PixelNavIcon.js';

export interface NavItemConfig {
  to: string;
  label: string;
  icon: NavIconType;
  badge?: number;
  end?: boolean;
}

export const MAIN_MOBILE_ROUTES = new Set(['/', '/explore', '/notifications', '/chats']);

export function isMainMobileRoute(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return MAIN_MOBILE_ROUTES.has(normalized);
}

export function buildNavItems(
  user: PublicUser,
  badges: { pendingNotifs: number; unreadMessages: number }
): NavItemConfig[] {
  return [
    { to: '/', label: 'Inicio', icon: 'home', end: true },
    { to: '/explore', label: 'Explorar', icon: 'explore' },
    { to: '/notifications', label: 'Notificaciones', icon: 'notifications', badge: badges.pendingNotifs },
    { to: '/chats', label: 'Mensajes', icon: 'messages', badge: badges.unreadMessages },
    { to: '/bookmarks', label: 'Guardados', icon: 'bookmarks' },
    { to: `/${user.username}`, label: 'Perfil', icon: 'member' },
    { to: '/settings', label: 'Configuración', icon: 'settings' },
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Administración', icon: 'admin' as const }] : []),
    ...(user.role === 'mod' ? [{ to: '/moderation', label: 'Moderación', icon: 'moderation' as const }] : []),
  ];
}

export function buildMobileBottomNavItems(
  badges: { pendingNotifs: number; unreadMessages: number }
): NavItemConfig[] {
  return [
    { to: '/', label: 'Inicio', icon: 'home', end: true },
    { to: '/explore', label: 'Explorar', icon: 'explore' },
    { to: '/notifications', label: 'Notificaciones', icon: 'notifications', badge: badges.pendingNotifs },
    { to: '/chats', label: 'Mensajes', icon: 'messages', badge: badges.unreadMessages },
  ];
}

export function buildMobileDrawerNavItems(user: PublicUser | null): NavItemConfig[] {
  if (!user) return [];
  return [
    { to: `/${user.username}`, label: 'Perfil', icon: 'member' },
    { to: '/bookmarks', label: 'Guardados', icon: 'bookmarks' },
    { to: '/settings', label: 'Configuración', icon: 'settings' },
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Administración', icon: 'admin' as const }] : []),
    ...(user.role === 'mod' || user.role === 'admin'
      ? [{ to: '/moderation', label: 'Moderación', icon: 'moderation' as const }]
      : []),
  ];
}

