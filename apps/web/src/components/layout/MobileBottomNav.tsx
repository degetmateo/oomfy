import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PixelNavIcon } from '../icons/PixelNavIcon.js';
import { useAuthStore } from '../../stores/authStore.js';
import { ApiClient } from '../../services/api.js';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuthStore();

  const { data: notifData } = useQuery<{ success: boolean; data: { pendingCount: number } }>({
    queryKey: ['notifications-summary'],
    queryFn: () => ApiClient.get('/notifications'),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  const { data: chatData } = useQuery<{ success: boolean; count: number }>({
    queryKey: ['unread-messages-count'],
    queryFn: () => ApiClient.get('/chats/unread-count'),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  const pendingNotifs = notifData?.data?.pendingCount || 0;
  const unreadMessages = chatData?.count || 0;

  const links = [
    { to: '/', name: 'home' as const },
    { to: '/explore', name: 'explore' as const },
    { to: '/notifications', name: 'notifications' as const, badge: pendingNotifs },
    { to: '/chats', name: 'messages' as const, badge: unreadMessages },
    { to: user ? `/${user.username}` : '/signin', name: 'member' as const },
    { to: '/settings', name: 'settings' as const },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161616]/95 backdrop-blur border-t border-dark-border py-2 px-2 flex justify-around items-center font-mono">
      {links.map(({ to, name, badge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `p-2 transition-colors flex items-center justify-center relative ${
              isActive ? 'text-brand-400' : 'text-dark-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <PixelNavIcon name={name} active={isActive} size={24} />
                {Boolean(badge && badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-bold bg-brand-500 text-black border border-brand-400">
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {isActive && (
                <span className="absolute bottom-0 w-3 h-0.5 bg-brand-500 rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

