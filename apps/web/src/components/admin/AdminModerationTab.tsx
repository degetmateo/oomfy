import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';

export const AdminModerationTab: React.FC = () => {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [targetId, setTargetId] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/admin/publications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      dialog.alert('La publicación ha sido eliminada por moderación.', 'Moderación exitosa');
      setTargetId('');
    },
    onError: (err: Error) => dialog.alert(err.message, 'Error al moderar publicación'),
  });

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    let id = targetId.trim();
    if (!id) return;
    if (id.includes('/publications/')) {
      id = id.split('/publications/').pop() || id;
    }

    const confirmed = await dialog.confirm({
      title: 'Eliminar publicación',
      message: `¿Estás seguro de que deseas eliminar permanentemente la publicación con ID ${id}?`,
      isDanger: true,
      confirmText: 'Eliminar',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="p-4 bg-dark-card border border-dark-border">
        <h3 className="text-xs font-bold text-white mb-1">Eliminación directa de publicación</h3>
        <p className="text-[11px] text-dark-muted mb-4">
          Ingresa el UUID o el enlace completo de la publicación que deseas dar de baja de la plataforma.
        </p>

        <form onSubmit={handleDelete} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="UUID de la publicación o URL..."
            className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
          />
          <button
            type="submit"
            disabled={!targetId.trim() || deleteMutation.isPending}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleteMutation.isPending ? 'Eliminando...' : 'Eliminar publicación'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

