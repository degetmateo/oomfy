import { PublicUser } from '@oomfy/shared';
import { NavIconType } from '../components/icons/PixelNavIcon.js';

export interface NavItemConfig {
  to: string;
  label: string;
  icon: NavIconType;
  badge?: number;
}

export function buildNavItems(
  user: PublicUser,
  badges: { pendingNotifs: number; unreadMessages: number }
): NavItemConfig[] {
  return [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/explore', label: 'Explorar', icon: 'explore' },
    { to: '/notifications', label: 'Notificaciones', icon: 'notifications', badge: badges.pendingNotifs },
    { to: '/chats', label: 'Mensajes', icon: 'messages', badge: badges.unreadMessages },
    { to: `/${user.username}`, label: 'Perfil', icon: 'member' },
    { to: '/settings', label: 'Configuración', icon: 'settings' },
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Administración', icon: 'settings' as const }] : []),
    ...(user.role === 'mod' ? [{ to: '/moderation', label: 'Moderación', icon: 'settings' as const }] : []),
  ];
}

