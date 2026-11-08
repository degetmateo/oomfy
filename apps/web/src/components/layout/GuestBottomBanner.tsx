import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';

export const GuestBottomBanner: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return null;

  return (
    <div className="fixed bottom-12 md:bottom-0 left-0 right-0 z-30 bg-[#12161f]/95 backdrop-blur border-t-2 border-brand-500 px-4 py-2.5 font-mono shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="text-center sm:text-left">
          <span className="font-bold text-brand-400 mr-2">¡No te pierdas lo que pasa en Oomfy!</span>
          <span className="text-dark-muted hidden sm:inline">
            Únete a la comunidad para publicar, responder y chatear en tiempo real.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/signin"
            className="px-3 py-1.5 border border-dark-border bg-dark-card text-white hover:border-brand-400 font-bold uppercase transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/signup"
            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-black font-bold uppercase pixel-button"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
};

