import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PixelNavIcon } from '../icons/PixelNavIcon.js';
import { useAuthStore } from '../../stores/authStore.js';
import { buildMobileBottomNavItems } from '../../config/navigation.js';
import { useNavBadges } from '../../hooks/useNavBadges.js';
import { RoutePrefetchService } from '../../services/RoutePrefetchService.js';

export const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const badges = useNavBadges();

  if (!isAuthenticated || !user) return null;

  const links = buildMobileBottomNavItems(badges);

  return (
    <nav aria-label="Navegación móvil" className="md:hidden mobile-keyboard-hide mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-[#161616]/95 backdrop-blur border-t border-dark-border flex justify-around items-stretch gap-1 font-mono select-none touch-manipulation">
      {links.map(({ to, label, icon, badge, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={badge && badge > 0 ? `${label} (${badge > 9 ? '9+' : badge})` : label}
          onPointerDown={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
          onMouseEnter={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
          onTouchStart={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
          onClick={() => { if (location.pathname === to) window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}
          className={({ isActive }) =>
            `flex-1 min-h-[52px] py-2 flex items-center justify-center relative rounded-lg touch-manipulation active:scale-95 active:opacity-80 transition-all duration-75 ${
              isActive ? 'text-brand-400 bg-brand-400/10' : 'text-dark-muted hover:text-dark-text'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <PixelNavIcon name={icon} active={isActive} size={26} />
                {Boolean(badge && badge > 0) && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-brand-500 text-black border border-brand-400">
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {isActive && <span className="absolute bottom-0.5 w-6 h-0.5 bg-brand-500 rounded-full" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
