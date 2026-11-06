import React, { useState, useEffect } from 'react';
import { Smartphone, Bell } from 'lucide-react';
import { usePwaStore } from '../../stores/pwaStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PushNotificationService } from '../../services/PushNotificationService.js';
import { PushPreferencesList } from './PushPreferencesList.js';
import { PwaInstallGuide } from './PwaInstallGuide.js';

export const AppPwaSettingsTab: React.FC = () => {
  const dialog = useDialogStore();
  const { isInstallable, promptInstall, isInstalled } = usePwaStore();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(PushNotificationService.isPermissionGranted());
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (notificationsGranted) {
      PushNotificationService.getEndpoint().then(setEndpoint);
    }
  }, [notificationsGranted]);

  const handleRequestNotifications = async () => {
    setIsSubscribing(true);
    try {
      const ok = await PushNotificationService.subscribe();
      if (ok) {
        setNotificationsGranted(true);
        const ep = await PushNotificationService.getEndpoint();
        setEndpoint(ep);
        dialog.alert('¡Notificaciones push activadas y sincronizadas con éxito!', 'Notificaciones');
      } else {
        dialog.alert('Permiso no concedido. Puedes habilitarlo en los ajustes de tu navegador.', 'Aviso');
      }
    } catch (err: any) {
      dialog.alert(err.message || 'Error al activar notificaciones.', 'Aviso');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
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
          <div>
            <span className="text-xs text-brand-400 font-bold flex items-center gap-1">
              ✓ Notificaciones push activadas en este dispositivo
            </span>
            <PushPreferencesList endpoint={endpoint} />
          </div>
        ) : (
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleRequestNotifications}
            className="py-2 px-3.5 border border-dark-border text-white hover:border-brand-500 hover:text-brand-400 font-bold text-xs pixel-button transition-colors disabled:opacity-50"
          >
            {isSubscribing ? 'Activando...' : 'Activar notificaciones'}
          </button>
        )}
      </div>

      <PwaInstallGuide />
    </div>
  );
};
