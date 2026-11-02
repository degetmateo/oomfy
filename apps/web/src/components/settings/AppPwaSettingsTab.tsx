import React, { useState } from 'react';
import { Smartphone, Bell } from 'lucide-react';
import { usePwaStore } from '../../stores/pwaStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const AppPwaSettingsTab: React.FC = () => {
  const dialog = useDialogStore();
  const { isInstallable, promptInstall, isInstalled } = usePwaStore();
  const [selectedOs, setSelectedOs] = useState<'android' | 'ios' | 'desktop'>('android');
  const [notificationsGranted, setNotificationsGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false
  );

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setNotificationsGranted(true);
        dialog.alert('¡Notificaciones activadas con éxito!', 'Notificaciones');
      } else {
        dialog.alert('Permiso no concedido. Puedes habilitarlo en los ajustes de tu navegador.', 'Aviso');
      }
    } else {
      dialog.alert('Tu navegador no soporta notificaciones push.', 'Aviso');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Instalar Aplicación</h3>
        <p className="text-xs text-dark-muted font-sans leading-relaxed">
          Instalá oomfy en tu teléfono móvil para acceder rápidamente y recibir notificaciones.
        </p>
      </div>

      {isInstalled ? (
        <div className="p-3.5 bg-brand-950/20 border border-brand-500/40 text-xs text-brand-400">
          ✓ oomfy ya se encuentra instalada en este dispositivo.
        </div>
      ) : isInstallable ? (
        <button
          type="button"
          onClick={() => promptInstall()}
          className="py-3 px-5 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors flex items-center justify-center gap-2 self-start"
        >
          <Smartphone className="w-4 h-4" />
          <span>Instalar oomfy directamente</span>
        </button>
      ) : (
        <div className="p-3 bg-dark-card border border-dark-border text-xs text-dark-muted font-sans">
          La instalación directa no está disponible en este navegador. Sigue la guía a continuación:
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-brand-400" />
          <span>Notificaciones Push</span>
        </h4>
        {notificationsGranted ? (
          <span className="text-xs text-brand-400 font-bold flex items-center gap-1">
            ✓ Notificaciones push activadas en este navegador
          </span>
        ) : (
          <button
            type="button"
            onClick={handleRequestNotifications}
            className="py-2 px-3.5 border border-dark-border text-white hover:border-brand-500 hover:text-brand-400 font-bold text-xs pixel-button transition-colors"
          >
            Activar notificaciones
          </button>
        )}
      </div>

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
    </div>
  );
};

