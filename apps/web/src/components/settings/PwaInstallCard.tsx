import React from 'react';
import { Smartphone } from 'lucide-react';
import { usePwaStore } from '../../stores/pwaStore.js';

export const PwaInstallCard: React.FC = () => {
  const { isInstallable, promptInstall, isInstalled } = usePwaStore();

  if (isInstalled) {
    return (
      <div className="p-3.5 bg-brand-950/20 border border-brand-500/40 text-xs text-brand-400">
        ✓ oomfy ya se encuentra instalada en este dispositivo.
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => promptInstall()}
        className="py-3 px-5 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors flex items-center justify-center gap-2 self-start"
      >
        <Smartphone className="w-4 h-4" />
        <span>Instalar oomfy directamente</span>
      </button>
    );
  }

  return (
    <div className="p-3 bg-dark-card border border-dark-border text-xs text-dark-muted font-sans">
      La instalación directa no está disponible en este navegador. Sigue la guía a continuación:
    </div>
  );
};
