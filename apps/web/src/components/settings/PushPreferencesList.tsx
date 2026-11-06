import React, { useEffect, useState } from 'react';
import {
  PushNotificationService,
  PushPreferences,
  DEFAULT_PUSH_PREFERENCES,
} from '../../services/PushNotificationService.js';

interface Props {
  endpoint?: string | null;
}

const PREF_ITEMS: { key: keyof PushPreferences; label: string; desc: string }[] = [
  { key: 'messages', label: 'Notificaciones de mensajes', desc: 'Mensajes privados recibidos en chats.' },
  { key: 'replies', label: 'Notificaciones de respuestas', desc: 'Respuestas a tus publicaciones.' },
  { key: 'quotes', label: 'Notificaciones de citas', desc: 'Citas de tus publicaciones.' },
  { key: 'upvotes', label: 'Notificaciones de me gusta', desc: 'Likes recibidos en tus publicaciones.' },
  { key: 'shares', label: 'Notificaciones de compartidos', desc: 'Usuarios que comparten tu publicación.' },
  { key: 'follows', label: 'Notificaciones de seguidores', desc: 'Nuevos usuarios que te siguen.' },
];

export const PushPreferencesList: React.FC<Props> = ({ endpoint }) => {
  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    PushNotificationService.getPreferences(endpoint || undefined)
      .then((data) => {
        if (isMounted) setPrefs(data.preferences);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const togglePref = async (key: keyof PushPreferences) => {
    const nextVal = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: nextVal }));
    setUpdating(key);
    try {
      await PushNotificationService.updatePreferences({ [key]: nextVal }, endpoint || undefined);
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !nextVal }));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="text-xs text-dark-muted font-mono animate-pulse">Cargando opciones...</div>;
  }

  return (
    <div className="flex flex-col gap-2.5 mt-3 border border-dark-border bg-dark-card/40 p-3">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1">
        Opciones de notificación
      </h5>
      <div className="divide-y divide-dark-border/60">
        {PREF_ITEMS.map(({ key, label, desc }) => {
          const enabled = prefs[key];
          return (
            <div key={key} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{label}</span>
                <span className="text-[11px] text-dark-muted font-sans">{desc}</span>
              </div>
              <button
                type="button"
                disabled={updating === key}
                onClick={() => togglePref(key)}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors pixel-button border ${
                  enabled
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400 hover:bg-brand-500/30'
                    : 'bg-dark-card border-dark-border text-dark-muted hover:text-white'
                }`}
              >
                {enabled ? 'Activado' : 'Desactivado'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
