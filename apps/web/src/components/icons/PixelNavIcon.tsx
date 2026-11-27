import React from 'react';
import { Bell, Bookmark, Home, Mail, Search, Settings, Shield, User } from 'lucide-react';

export type NavIconType =
  | 'home'
  | 'explore'
  | 'notifications'
  | 'messages'
  | 'bookmarks'
  | 'member'
  | 'settings'
  | 'admin'
  | 'moderation';

interface Props {
  name: NavIconType;
  active?: boolean;
  className?: string;
  size?: number;
}

const ICONS: Record<NavIconType, React.ComponentType<any>> = {
  home: Home,
  explore: Search,
  notifications: Bell,
  messages: Mail,
  bookmarks: Bookmark,
  member: User,
  settings: Settings,
  admin: Shield,
  moderation: Shield,
};

export const PixelNavIcon: React.FC<Props> = ({ name, active = false, className = '', size = 22 }) => {
  const Icon = ICONS[name] || Home;

  return (
    <Icon
      width={size}
      height={size}
      size={size}
      strokeWidth={active ? 2.3 : 1.9}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.16 : 0}
      aria-hidden="true"
      data-nav-icon={name}
      className={`inline-block flex-shrink-0 select-none ${active ? 'text-brand-400' : ''} ${className}`}
    />
  );
};
