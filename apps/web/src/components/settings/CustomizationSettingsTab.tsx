import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { CustomEmote, EmoteNameSchema, LIMITS } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useEmoteStore } from '../../stores/emoteStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { EmoteListSection } from './EmoteListSection.js';

export const CustomizationSettingsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { emotes, isLoading, fetchEmotes, addEmote } = useEmoteStore();
  const dialog = useDialogStore();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const myCount = emotes.filter((e) => e.creator_id === user?.id).length;
  const limitReached = myCount >= LIMITS.EMOTE_MAX_PER_USER;

  useEffect(() => { void fetchEmotes(true); }, [fetchEmotes]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const selectFile = (incoming?: File) => {
    if (!incoming || limitReached) return;
    if (incoming.size > LIMITS.EMOTE_MAX_FILE_BYTES) return void dialog.alert('El emote es muy pesado. Máximo 256 KB (estilo Discord).', 'Imagen demasiado pesada');
    const url = URL.createObjectURL(incoming);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 256 || img.naturalHeight > 256) { URL.revokeObjectURL(url); return void dialog.alert('La imagen debe ser pequeña (máximo 128x128 o 256x256 px).', 'Dimensiones demasiado grandes'); }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(incoming); setPreviewUrl(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); void dialog.alert('No se pudo leer la imagen.', 'Archivo inválido'); };
    img.src = url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) return void dialog.alert(`Has alcanzado el límite de ${LIMITS.EMOTE_MAX_PER_USER} emotes.`, 'Límite alcanzado');
    const parsed = EmoteNameSchema.safeParse(name.trim());
    if (!parsed.success) return void dialog.alert(parsed.error.issues[0]?.message || 'Nombre de emote inválido.', 'Nombre inválido');
    if (!file) return void dialog.alert('Selecciona una imagen pequeña para el emote.', 'Falta imagen');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', parsed.data); formData.append('image', file);
      const res = await ApiClient.post<{ success: boolean; data: CustomEmote }>('/settings/emotes', formData);
      addEmote(res.data); setName(''); setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = '';
      await dialog.alert(`Emote :${res.data.name}: subido. ¡Ya puedes usarlo en publicaciones y chats!`, 'Personalización');
    } catch (err) {
      await dialog.alert((err as Error).message, 'Error al subir emote');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-5 font-mono">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Emotes personalizados</h3>
          <span className={`text-xs font-bold ${limitReached ? 'text-red-400' : 'text-brand-400'}`}>Mis emotes: {myCount}/{LIMITS.EMOTE_MAX_PER_USER}</span>
        </div>
        <p className="text-xs text-dark-muted font-sans leading-relaxed -mt-2">
          Sube hasta {LIMITS.EMOTE_MAX_PER_USER} emotes pequeños (máx. 256 KB y hasta 256x256 px) para usarlos escribiendo <code className="text-brand-400">:nombre:</code>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center bg-dark-card border border-dark-border px-3 py-2 text-xs">
            <span className="text-brand-400 font-bold mr-1">:</span>
            <input type="text" aria-label="Nombre del emote" value={name} disabled={limitReached} onChange={(e) => setName(e.target.value)} placeholder="nombre_del_emote" maxLength={LIMITS.EMOTE_NAME_MAX} className="bg-transparent text-white outline-none flex-1 font-mono disabled:opacity-50" />
            <span className="text-brand-400 font-bold ml-1">:</span>
          </div>
          <label className={`px-3 py-2 bg-dark-card border border-dark-border text-xs text-white flex items-center justify-center gap-1.5 ${limitReached ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-500 cursor-pointer'}`}>
            <Upload className="w-3.5 h-3.5 text-brand-400" />
            <span>{file ? 'Cambiar imagen' : 'Elegir imagen'}</span>
            <input ref={fileRef} type="file" disabled={limitReached} accept="image/png,image/gif,image/webp,image/jpeg" aria-label="Imagen del emote" className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} />
          </label>
        </div>
        {previewUrl && (
          <div className="flex items-center gap-2 text-xs text-dark-muted">
            <span>Vista previa:</span>
            <img src={previewUrl} alt="Vista previa emote" className="w-6 h-6 object-contain border border-dark-border bg-dark-card p-0.5" />
            <span className="text-white font-bold">:{name.trim() || 'emote'}:</span>
          </div>
        )}
        <button type="submit" disabled={submitting || limitReached || !name.trim() || !file} className="py-2 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors self-start">
          {submitting ? 'Subiendo...' : limitReached ? `Límite alcanzado (${LIMITS.EMOTE_MAX_PER_USER}/${LIMITS.EMOTE_MAX_PER_USER})` : 'Subir emote'}
        </button>
      </form>
      <EmoteListSection emotes={emotes} isLoading={isLoading} />
    </div>
  );
};
