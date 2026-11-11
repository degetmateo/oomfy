import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PixelNavIcon } from '../icons/PixelNavIcon.js';
import { useAuthStore } from '../../stores/authStore.js';
import { buildNavItems } from '../../config/navigation.js';
import { useNavBadges } from '../../hooks/useNavBadges.js';

export const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const badges = useNavBadges();

  if (!isAuthenticated || !user) return null;

  const links = buildNavItems(user, badges);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161616]/95 backdrop-blur border-t border-dark-border py-2 px-2 flex justify-around items-center font-mono">
      {links.map(({ to, icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => { if (location.pathname === to) window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}
          className={({ isActive }) =>
            `p-2 transition-colors flex items-center justify-center relative ${
              isActive ? 'text-brand-400' : 'text-dark-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <PixelNavIcon name={icon} active={isActive} size={24} />
                {Boolean(badge && badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-bold bg-brand-500 text-black border border-brand-400">
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {isActive && <span className="absolute bottom-0 w-3 h-0.5 bg-brand-500 rounded-full" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
