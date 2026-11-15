import React, { useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { CustomEmote, LIMITS } from '@oomfy/shared';
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
  const { removeEmote, importEmote } = useEmoteStore();
  const dialog = useDialogStore();
  const [importingId, setImportingId] = useState<string | null>(null);

  const myEmotes = useMemo(() => emotes.filter((e) => e.creator_id === user?.id), [emotes, user?.id]);
  const myNames = useMemo(() => new Set(myEmotes.map((e) => e.name.toLowerCase())), [myEmotes]);
  const limitReached = myEmotes.length >= LIMITS.EMOTE_MAX_PER_USER;

  const communityEmotes = useMemo(() => {
    const seen = new Set<string>();
    return emotes.filter((e) => {
      if (e.creator_id === user?.id) return false;
      const key = `${e.name.toLowerCase()}::${e.image_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [emotes, user?.id]);

  const handleDelete = async (emote: CustomEmote) => {
    const ok = await dialog.confirm({ title: 'Eliminar emote', message: `¿Deseas eliminar :${emote.name}: de tu colección?`, isDanger: true });
    if (!ok) return;
    try { await ApiClient.delete(`/settings/emotes/${emote.id}`); removeEmote(emote.id); }
    catch (err) { await dialog.alert((err as Error).message, 'Error al eliminar emote'); }
  };

  const handleImport = async (emote: CustomEmote) => {
    setImportingId(emote.id);
    try { await importEmote(emote.id); await dialog.alert(`Emote :${emote.name}: agregado a tu colección.`, 'Personalización'); }
    catch (err) { await dialog.alert((err as Error).message, 'Error al importar emote'); }
    finally { setImportingId(null); }
  };

  const renderCard = (emote: CustomEmote, mode: 'mine' | 'other') => {
    const alreadyOwned = myNames.has(emote.name.toLowerCase());
    const disabled = importingId === emote.id || alreadyOwned || limitReached;
    return (
      <div key={emote.id} className="flex items-center justify-between gap-2 p-2 bg-dark-card/60 border border-dark-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={emote.image_url} alt={`:${emote.name}:`} className="w-7 h-7 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">:{emote.name}:</div>
            <div className="text-[10px] text-dark-muted truncate">por @{emote.creator_username}</div>
          </div>
        </div>
        {mode === 'mine' ? (
          <button type="button" onClick={() => void handleDelete(emote)} title={`Eliminar :${emote.name}:`} aria-label={`Eliminar emote ${emote.name}`} className="p-1.5 text-dark-muted hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button type="button" disabled={disabled} onClick={() => void handleImport(emote)} aria-label={`Importar emote ${emote.name}`} className="px-2 py-1 text-[10px] font-bold uppercase border border-dark-border text-brand-400 hover:border-brand-500 disabled:opacity-40 flex items-center gap-1 flex-shrink-0">
            <Download className="w-3 h-3" />
            <span>{alreadyOwned ? 'Tuyo' : importingId === emote.id ? '...' : 'Importar'}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="pt-4 border-t border-dark-border flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Tu colección ({myEmotes.length}/{LIMITS.EMOTE_MAX_PER_USER})</h4>
        {isLoading && emotes.length === 0 ? <p className="text-xs text-dark-muted">Cargando emotes...</p>
          : myEmotes.length === 0 ? <p className="text-xs text-dark-muted font-sans">Aún no tienes emotes en tu colección. Sube uno o importa de otros usuarios.</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{myEmotes.map((e) => renderCard(e, 'mine'))}</div>}
      </div>
      {communityEmotes.length > 0 && (
        <div className="pt-3 border-t border-dark-border/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-dark-muted mb-2">Emotes de otros usuarios ({communityEmotes.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{communityEmotes.map((e) => renderCard(e, 'other'))}</div>
        </div>
      )}
    </div>
  );
};
