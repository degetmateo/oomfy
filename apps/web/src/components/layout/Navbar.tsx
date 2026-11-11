import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { PixelLogo } from '../icons/PixelLogo.js';
import { PixelNavIcon } from '../icons/PixelNavIcon.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { buildNavItems } from '../../config/navigation.js';
import { useNavBadges } from '../../hooks/useNavBadges.js';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { openPostModal } = useUIStore();
  const location = useLocation();
  const badges = useNavBadges();

  const links = isAuthenticated && user ? buildNavItems(user, badges) : [];

  return (
    <aside className="hidden md:flex w-64 flex-col justify-between h-screen sticky top-0 border-r border-dark-border p-4 bg-dark-bg select-none font-mono">
      <div className="flex flex-col gap-4">
        <Link to="/" className="px-3 py-2 flex items-center">
          <PixelLogo />
        </Link>

        {links.length > 0 && (
          <nav className="flex flex-col gap-1.5">
            {links.map(({ to, label, icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => { if (location.pathname === to) window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 border transition-colors ${
                    isActive ? 'border-dark-border bg-dark-card text-brand-400 font-bold' : 'border-transparent text-dark-text hover:border-dark-border hover:bg-dark-card/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <PixelNavIcon name={icon} active={isActive} size={20} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {Boolean(badge && badge > 0) && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-black border border-brand-400">
                        {(badge ?? 0) > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {isAuthenticated && user && (
          <button
            onClick={() => openPostModal()}
            className="w-full mt-2 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-black font-bold text-center text-sm uppercase tracking-wider pixel-button block"
          >
            Publicar
          </button>
        )}
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center justify-between p-2.5 bg-dark-card border border-dark-border">
          <Link to={`/${user.username}`} className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
            <PixelAvatar src={user.icon_url} username={user.username} sizeClass="w-9 h-9" />
            <div className="truncate text-xs">
              <p className="font-bold text-white truncate">{user.name}</p>
              <p className="text-dark-muted truncate">@{user.username}</p>
            </div>
          </Link>
          <button onClick={logout} title="Cerrar sesión" className="text-dark-muted hover:text-red-400 p-1 flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Link to="/signin" className="w-full py-2 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold text-center text-xs uppercase transition-colors">
            Iniciar sesión
          </Link>
          <Link to="/signup" className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-black font-bold text-center text-xs uppercase pixel-button">
            Crear cuenta
          </Link>
        </div>
      )}
    </aside>
  );
};
