import React, { useContext, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { QueryClientContext } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const OnlineStatusSettingsSection: React.FC = () => {
  const toggleId = useId();
  const hintId = useId();
  const queryClient = useContext(QueryClientContext);
  const { user, setUser } = useAuthStore();
  const dialog = useDialogStore();
  const [isSaving, setIsSaving] = useState(false);

  const showOnline = user?.show_online_status !== false;

  const handleToggle = async (nextVal: boolean) => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const res = await ApiClient.put<{ success: boolean; data: { show_online_status: boolean } }>(
        '/settings/online-status',
        { show_online_status: nextVal }
      );
      setUser({ ...user, show_online_status: res.data.show_online_status });
      queryClient?.invalidateQueries({ queryKey: ['online-members'] });
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al actualizar estado en línea');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby={`${toggleId}-heading`} className="mt-6 pt-5 border-t border-dark-border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${toggleId}-heading`} className="text-sm font-bold text-white">Estado en línea</h3>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-2 py-0.5 border ${showOnline ? 'border-brand-500 text-brand-400 bg-brand-500/10' : 'border-dark-border text-dark-muted bg-dark-card'}`}>
          {showOnline ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
          <span>{showOnline ? 'En línea' : 'Invisible'}</span>
        </span>
      </div>
      <p id={hintId} className="text-xs text-dark-muted font-sans leading-relaxed">
        Permite que otros usuarios vean cuando estás conectado en la lista de miembros en línea.
      </p>
      <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-3 py-2.5">
        <input
          id={toggleId}
          name="show_online_status"
          type="checkbox"
          checked={showOnline}
          disabled={isSaving}
          aria-describedby={hintId}
          onChange={(e) => void handleToggle(e.target.checked)}
          className="w-4 h-4 accent-[#00dc65] cursor-pointer disabled:opacity-50"
        />
        <label htmlFor={toggleId} className="text-xs font-bold text-white cursor-pointer select-none flex-1">
          Mostrar mi estado en línea a otros miembros
        </label>
      </div>
    </section>
  );
};
