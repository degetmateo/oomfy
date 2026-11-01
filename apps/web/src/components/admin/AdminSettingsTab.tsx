import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { SystemSettings } from '@oomfy/shared';
import { AdminSettingToggle } from './AdminSettingToggle.js';

const SETTING_ITEMS = [
  { key: 'disable_post_creation' as const, title: 'Desactivar creación de publicaciones', desc: 'Bloquea la publicación de nuevos posts y respuestas para usuarios regulares.' },
  { key: 'disable_profile_editing' as const, title: 'Desactivar edición de perfiles', desc: 'Impide modificar nombre, avatar, portada y nombre de usuario.' },
  { key: 'disable_signups' as const, title: 'Desactivar registro de nuevos usuarios', desc: 'Pausa el registro de nuevas cuentas temporalmente.' },
  { key: 'disable_signins' as const, title: 'Desactivar inicio de sesión', desc: 'Impide que los usuarios regulares inicien sesión en oomfy.' },
];

export const AdminSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();

  const { data, isLoading } = useQuery<{ success: boolean; data: SystemSettings }>({
    queryKey: ['admin-settings'],
    queryFn: () => ApiClient.get('/admin/settings'),
  });

  const mutation = useMutation({
    mutationFn: (partial: Partial<SystemSettings>) => ApiClient.put('/admin/settings', partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      dialog.alert('Los ajustes del sistema han sido actualizados.', 'Ajustes guardados');
    },
    onError: (err: Error) => dialog.alert(err.message, 'Error al guardar'),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => ApiClient.post<any>('/admin/sessions/revoke-all'),
    onSuccess: (res) => dialog.alert(res.message || 'Todas las sesiones fueron cerradas.', 'Sesiones revocadas'),
    onError: (err: Error) => dialog.alert(err.message, 'Error'),
  });

  const settings = data?.data || {
    disable_post_creation: false,
    disable_profile_editing: false,
    disable_signups: false,
    disable_signins: false,
  };

  const handleToggle = async (key: keyof SystemSettings) => {
    const nextVal = !settings[key];
    const confirmed = await dialog.confirm({
      title: 'Cambiar configuración global',
      message: `¿Estás seguro de que deseas ${nextVal ? 'activar' : 'desactivar'} esta restricción?`,
      isDanger: nextVal,
    });
    if (confirmed) mutation.mutate({ [key]: nextVal });
  };

  const handleRevokeAll = async () => {
    const confirmed = await dialog.confirm({
      title: 'Cerrar todas las sesiones',
      message: '¿Estás seguro de que deseas desconectar a todos los usuarios de la plataforma inmediatamente?',
      isDanger: true,
      confirmText: 'Cerrar todas',
    });
    if (confirmed) revokeAllMutation.mutate();
  };

  if (isLoading) return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando ajustes...</div>;

  return (
    <div className="divide-y divide-dark-border p-4 font-mono">
      {SETTING_ITEMS.map(({ key, title, desc }) => (
        <AdminSettingToggle
          key={key}
          title={title}
          desc={desc}
          isEnabled={Boolean(settings[key])}
          onToggle={() => handleToggle(key)}
        />
      ))}

      <div className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-400">Cerrar todas las sesiones de la plataforma</p>
          <p className="text-[11px] text-dark-muted mt-0.5">Desconecta todas las sesiones abiertas de todos los usuarios en oomfy.</p>
        </div>
        <button
          type="button"
          onClick={handleRevokeAll}
          disabled={revokeAllMutation.isPending}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs pixel-button flex items-center gap-1.5 border border-red-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{revokeAllMutation.isPending ? 'Cerrando...' : 'Cerrar todas las sesiones'}</span>
        </button>
      </div>
    </div>
  );
};
