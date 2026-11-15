import React from 'react';
import { Trash2 } from 'lucide-react';
import { CustomEmote } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useEmoteStore } from '../../stores/emoteStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

interface Props {
  emotes: CustomEmote[];
  isLoading: boolean;
}

export const EmoteListSection: React.FC<Props> = ({ emotes, isLoading }) => {
  const { user } = useAuthStore();
  const { removeEmote } = useEmoteStore();
  const dialog = useDialogStore();

  const handleDelete = async (emote: CustomEmote) => {
    const ok = await dialog.confirm({
      title: 'Eliminar emote',
      message: `¿Deseas eliminar :${emote.name}: de la plataforma?`,
      isDanger: true,
    });
    if (!ok) return;
    try {
      await ApiClient.delete(`/settings/emotes/${emote.id}`);
      removeEmote(emote.id);
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al eliminar emote');
    }
  };

  return (
    <div className="pt-4 border-t border-dark-border">
      <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">
        Emotes disponibles ({emotes.length})
      </h4>
      {isLoading && emotes.length === 0 ? (
        <p className="text-xs text-dark-muted">Cargando emotes...</p>
      ) : emotes.length === 0 ? (
        <p className="text-xs text-dark-muted font-sans">Aún no hay emotes personalizados subidos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {emotes.map((emote) => {
            const canDelete = Boolean(
              user && (user.id === emote.creator_id || user.role === 'admin' || user.role === 'mod')
            );
            return (
              <div
                key={emote.id}
                className="flex items-center justify-between gap-2 p-2 bg-dark-card/60 border border-dark-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={emote.image_url} alt={`:${emote.name}:`} className="w-7 h-7 object-contain flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">:{emote.name}:</div>
                    <div className="text-[10px] text-dark-muted truncate">por @{emote.creator_username}</div>
                  </div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(emote)}
                    title={`Eliminar :${emote.name}:`}
                    aria-label={`Eliminar emote ${emote.name}`}
                    className="p-1.5 text-dark-muted hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
