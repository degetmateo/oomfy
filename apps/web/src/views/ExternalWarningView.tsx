import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ExternalLink, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Header } from '../components/layout/Header.js';

export const ExternalWarningView: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const targetUrl = params.get('url') || '';

  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    hostname = targetUrl;
  }

  const handleProceed = () => {
    if (!targetUrl) return;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Aviso de enlace" />

      <div className="p-4 sm:p-8 max-w-lg mx-auto w-full">
        <div className="border-2 border-dark-border bg-dark-bg p-5 sm:p-6 shadow-pixel text-center">
          <div className="w-12 h-12 mx-auto mb-4 border border-brand-500/50 bg-brand-500/10 flex items-center justify-center text-brand-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white mb-2 tracking-wide">
            Vas a salir de oomfy
          </h2>

          <p className="text-xs text-dark-muted leading-relaxed mb-4">
            El enlace al que intentas acceder te llevará a una página externa fuera de <span className="text-brand-400 font-bold">oomfy</span>. Ten precaución y nunca introduzcas tu contraseña ni datos sensibles en sitios desconocidos.
          </p>

          <div className="p-3 border border-dark-border bg-dark-card/60 text-xs text-left mb-6 break-all font-mono">
            <span className="text-dark-muted block text-[10px] uppercase font-bold tracking-wider mb-1">
              Destino: {hostname}
            </span>
            <span className="text-white select-all">{targetUrl}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-dark-border bg-dark-card hover:bg-dark-border text-white text-xs font-bold pixel-button flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a oomfy</span>
            </button>

            <button
              onClick={handleProceed}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold pixel-button flex items-center justify-center gap-2"
            >
              <span>Continuar al enlace</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

