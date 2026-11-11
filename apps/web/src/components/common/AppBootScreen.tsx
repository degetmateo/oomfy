import React from 'react';
import { PixelLogo } from '../icons/PixelLogo.js';

export const AppBootScreen: React.FC = () => (
  <div
    role="status"
    aria-label="Cargando aplicación"
    className="min-h-[100dvh] w-full bg-dark-bg text-dark-text flex flex-col items-center justify-center gap-5 px-4 font-mono select-none"
  >
    <PixelLogo size={40} />
    <div className="w-7 h-7 border-2 border-dark-border border-t-brand-500 rounded-full animate-spin" />
    <p className="text-xs text-dark-muted tracking-wide">Cargando oomfy...</p>
  </div>
);

