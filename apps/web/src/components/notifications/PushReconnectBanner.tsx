import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { PushNotificationService } from '../../services/PushNotificationService.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const PushReconnectBanner: React.FC = () => {
  const { isAuthenticated, isLoading, token } = useAuthStore();
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const dialog = useDialogStore();

  useEffect(() => {
    if (!isAuthenticated || isLoading || !token) {
      if (!isAuthenticated && !isLoading) setNeedsReconnect(false);
      return;
    }
    let isMounted = true;
    PushNotificationService.checkSubscriptionHealth().then((res) => {
      if (isMounted && res.needsReconnect) {
        setNeedsReconnect(true);
      }
    });
    return () => { isMounted = false; };
  }, [isAuthenticated, isLoading, token]);

  if (!needsReconnect || isDismissed) return null;

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      const ok = await PushNotificationService.reconnect();
      if (ok) {
        setNeedsReconnect(false);
        dialog.alert('Notificaciones push reconectadas con éxito.', 'Notificaciones');
      } else {
        dialog.alert('No se pudo reconectar la suscripción. Intenta desde Configuración > App.', 'Aviso');
      }
    } catch (err: any) {
      dialog.alert(err.message || 'Error al reconectar notificaciones.', 'Aviso');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="bg-amber-950/40 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="truncate font-mono">Tus notificaciones push se desconectaron en este dispositivo.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isReconnecting}
          onClick={handleReconnect}
          className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-black font-bold font-mono text-[11px] pixel-button flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isReconnecting && <RefreshCw className="w-3 h-3 animate-spin" />}
          <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-amber-400/80 hover:text-amber-300 p-1 transition-colors"
          title="Descartar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

