import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { SystemSettings } from '@oomfy/shared';

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
    onError: (err: Error) => {
      dialog.alert(err.message, 'Error al guardar');
    },
  });

  const settings = data?.data || {
    disable_post_creation: false,
    disable_profile_editing: false,
    disable_signups: false,
  };

  const handleToggle = async (key: keyof SystemSettings) => {
    const nextVal = !settings[key];
    const confirmed = await dialog.confirm({
      title: 'Cambiar configuración global',
      message: `¿Estás seguro de que deseas ${nextVal ? 'activar' : 'desactivar'} esta restricción para toda la plataforma?`,
      isDanger: nextVal,
    });
    if (confirmed) {
      mutation.mutate({ [key]: nextVal });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando ajustes...</div>;
  }

  const items = [
    {
      key: 'disable_post_creation' as const,
      title: 'Desactivar creación de publicaciones',
      desc: 'Bloquea la publicación de nuevos posts y respuestas para usuarios regulares.',
    },
    {
      key: 'disable_profile_editing' as const,
      title: 'Desactivar edición de perfiles',
      desc: 'Impide modificar nombre, avatar, portada y nombre de usuario.',
    },
    {
      key: 'disable_signups' as const,
      title: 'Desactivar registro de nuevos usuarios',
      desc: 'Pausa el registro de nuevas cuentas temporalmente.',
    },
  ];

  return (
    <div className="divide-y divide-dark-border p-4">
      {items.map(({ key, title, desc }) => (
        <div key={key} className="py-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold text-white">{title}</p>
            <p className="text-[11px] text-dark-muted mt-0.5">{desc}</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(key)}
            className={`px-3 py-1.5 text-xs font-bold pixel-button border transition-colors ${
              settings[key]
                ? 'bg-red-500 text-black border-red-400 hover:bg-red-600'
                : 'bg-dark-card text-brand-400 border-dark-border hover:border-brand-500'
            }`}
          >
            {settings[key] ? 'DESACTIVAR' : 'HABILITADO'}
          </button>
        </div>
      ))}
    </div>
  );
};

