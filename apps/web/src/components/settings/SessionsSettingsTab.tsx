import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Laptop, Trash2 } from 'lucide-react';
import { Session } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const SessionsSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();

  const { data: sessionsData, isLoading } = useQuery<{ success: boolean; data: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => ApiClient.get('/sessions'),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const handleRevokeSession = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Revocar sesión',
      message: '¿Deseas cerrar esta sesión? El dispositivo deberá volver a identificarse.',
      isDanger: true,
      confirmText: 'Cerrar sesión',
    });
    if (confirmed) {
      revokeSessionMutation.mutate(id);
    }
  };

  const handleRevokeAllOthers = async () => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar otras sesiones',
      message: '¿Deseas cerrar todas las sesiones abiertas en otros dispositivos?',
      isDanger: true,
      confirmText: 'Cerrar todas',
    });
    if (confirmed) {
      await ApiClient.delete('/sessions/others');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await dialog.alert('Todas las demás sesiones fueron cerradas.', 'Sesiones');
    }
  };

  const sessions = sessionsData?.data || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-0.5">Sesiones Activas</h3>
          <p className="text-xs text-dark-muted font-sans">
            Dispositivos en los que has iniciado sesión en oomfy.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRevokeAllOthers}
          className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-[11px] pixel-button transition-colors"
        >
          Cerrar las demás
        </button>
      </div>

      <div className="divide-y divide-dark-border border border-dark-border bg-dark-card/30">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-dark-muted">Cargando sesiones...</div>
        ) : sessions.length > 0 ? (
          sessions.map((sess) => (
            <div key={sess.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-dark-bg border border-dark-border text-brand-400 flex-shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-white truncate">{sess.platform || 'Navegador Web'}</p>
                  <p className="text-[11px] text-dark-muted truncate">
                    IP: {sess.ip} · {new Date(sess.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRevokeSession(sess.id)}
                className="p-1.5 text-dark-muted hover:text-red-400 hover:bg-red-950/20 transition-colors flex-shrink-0"
                title="Cerrar sesión"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-xs text-dark-muted">No hay sesiones activas registradas.</div>
        )}
      </div>
    </div>
  );
};

