import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PushNotificationService } from '../../services/PushNotificationService.js';
import { PushPreferencesList } from './PushPreferencesList.js';
import { PwaInstallCard } from './PwaInstallCard.js';
import { PwaInstallGuide } from './PwaInstallGuide.js';

export const AppPwaSettingsTab: React.FC = () => {
  const dialog = useDialogStore();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(PushNotificationService.isPermissionGranted());
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'expired'>('active');

  useEffect(() => {
    if (notificationsGranted) {
      PushNotificationService.getEndpoint().then((ep) => {
        setEndpoint(ep);
        PushNotificationService.getPreferences(ep || undefined).then((res) => setStatus(res.status as any)).catch(() => {});
      });
    }
  }, [notificationsGranted]);

  const handleSubscribeOrRenew = async () => {
    setIsSubscribing(true);
    try {
      const ok = await PushNotificationService.subscribe();
      if (ok) {
        setNotificationsGranted(true);
        setStatus('active');
        setEndpoint(await PushNotificationService.getEndpoint());
        dialog.alert('¡Suscripción push activada y renovada con éxito!', 'Notificaciones');
      } else {
        dialog.alert('Permiso no concedido. Puedes habilitarlo en los ajustes de tu navegador.', 'Aviso');
      }
    } catch (err: any) {
      dialog.alert(err.message || 'Error al procesar suscripción.', 'Aviso');
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

      <PwaInstallCard />

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-brand-400" />
          <span>Notificaciones Push</span>
        </h4>
        {notificationsGranted && (!endpoint || status === 'expired') && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 flex items-center justify-between gap-3 mb-2">
            <span>⚠️ Tu suscripción push se desconectó o caducó en este dispositivo.</span>
            <button
              type="button"
              disabled={isSubscribing}
              onClick={handleSubscribeOrRenew}
              className="py-1 px-3 bg-amber-400 hover:bg-amber-500 text-black font-bold text-[11px] pixel-button transition-colors"
            >
              Reconectar
            </button>
          </div>
        )}
        {notificationsGranted && endpoint && status !== 'expired' ? (
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
            onClick={handleSubscribeOrRenew}
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
