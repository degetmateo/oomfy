import React, { useContext, useState } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const OnlineStatusSettingsSection: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const queryClient = useContext(QueryClientContext);
  const dialog = useDialogStore();
  const [saving, setSaving] = useState(false);

  const isEnabled = user?.show_online_status !== false;

  const handleToggle = async () => {
    if (!user || saving) return;
    const nextValue = !isEnabled;
    setSaving(true);
    try {
      const res = await ApiClient.put<{ success: boolean; data: { show_online_status: boolean } }>(
        '/settings/online-status',
        { show_online_status: nextValue }
      );
      const saved = res?.data?.show_online_status ?? nextValue;
      setUser({ ...user, show_online_status: saved });
      queryClient?.invalidateQueries({ queryKey: ['online-members'] });
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error de privacidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 pt-6 border-t border-dark-border flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Eye className="w-4 h-4 text-brand-400 flex-shrink-0" aria-hidden="true" />
          <label htmlFor="toggle-online-status" className="cursor-pointer">
            Miembros en línea
          </label>
        </div>
        <p className="text-xs text-dark-muted mt-1 font-sans leading-relaxed">
          Muestra el banner de miembros conectados (hasta 6 al azar) y permite que otros te vean cuando estés en línea.
        </p>
      </div>
      <button
        id="toggle-online-status"
        type="button"
        role="switch"
        aria-checked={isEnabled}
        disabled={saving}
        onClick={handleToggle}
        className={`px-3 py-1.5 text-xs font-bold border uppercase tracking-wider transition-colors pixel-button flex-shrink-0 ${
          isEnabled
            ? 'bg-brand-500 text-black border-brand-500 hover:bg-brand-600'
            : 'bg-dark-card text-dark-muted border-dark-border hover:text-white'
        }`}
      >
        {saving ? '...' : isEnabled ? 'Activado' : 'Desactivado'}
      </button>
    </section>
  );
};
