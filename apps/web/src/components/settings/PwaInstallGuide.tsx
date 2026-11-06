import React, { useState } from 'react';

export const PwaInstallGuide: React.FC = () => {
  const [selectedOs, setSelectedOs] = useState<'android' | 'ios' | 'desktop'>('android');

  return (
    <div className="border border-dark-border bg-dark-card/30 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Guía de instalación</h4>
      <div className="flex border-b border-dark-border mb-3 text-xs">
        {(['android', 'ios', 'desktop'] as const).map((os) => (
          <button
            key={os}
            type="button"
            onClick={() => setSelectedOs(os)}
            className={`pb-2 px-3 font-bold transition-colors border-b-2 uppercase text-[11px] ${
              selectedOs === os ? 'border-brand-400 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
            }`}
          >
            {os === 'ios' ? 'iOS (iPhone)' : os === 'desktop' ? 'Escritorio' : 'Android'}
          </button>
        ))}
      </div>

      {selectedOs === 'android' && (
        <ol className="list-decimal list-inside text-xs text-dark-text/90 space-y-1.5 font-sans">
          <li>Abre Chrome en tu teléfono Android y presiona el menú de tres puntos (⋮).</li>
          <li>Selecciona "Instalar aplicación" o "Agregar a la pantalla principal".</li>
        </ol>
      )}
      {selectedOs === 'ios' && (
        <ol className="list-decimal list-inside text-xs text-dark-text/90 space-y-1.5 font-sans">
          <li>Toca el botón Compartir en Safari (icono de cuadrado con flecha hacia arriba).</li>
          <li>Desplázate y selecciona "Agregar a pantalla de inicio".</li>
        </ol>
      )}
      {selectedOs === 'desktop' && (
        <ol className="list-decimal list-inside text-xs text-dark-text/90 space-y-1.5 font-sans">
          <li>En Chrome o Edge, haz clic en el icono de instalación en la barra de URL.</li>
          <li>Haz clic en "Instalar" para abrir oomfy como ventana independiente.</li>
        </ol>
      )}
    </div>
  );
};
