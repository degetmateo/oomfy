import React from 'react';
import { Link } from 'react-router-dom';
import { PixelLogo } from '../icons/PixelLogo.js';
import { useAuthStore } from '../../stores/authStore.js';

export const MobileHeader: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-dark-bg/95 backdrop-blur border-b border-dark-border px-4 py-2.5 flex items-center justify-between font-mono">
      <Link to="/" className="flex items-center">
        <PixelLogo />
      </Link>

      {user ? (
        <Link
          to={`/${user.username}`}
          className="w-8 h-8 border border-dark-border bg-dark-card flex items-center justify-center font-bold text-xs text-brand-400 overflow-hidden"
        >
          {user.icon_url ? (
            <img src={user.icon_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </Link>
      ) : (
        <Link
          to="/signin"
          className="px-2.5 py-1 text-xs font-bold border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black transition-colors uppercase"
        >
          entrar
        </Link>
      )}
    </header>
  );
};
