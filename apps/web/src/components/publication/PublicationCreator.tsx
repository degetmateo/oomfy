import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image, Film, X } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { KlipyGifModal } from './KlipyGifModal.js';
import { Publication } from '@oomfy/shared';

interface Props {
  onCreated?: () => void;
  autoFocus?: boolean;
  quotedPublication?: Publication | null;
  onRemoveQuoted?: () => void;
}

export const PublicationCreator: React.FC<Props> = ({
  onCreated,
  autoFocus = false,
  quotedPublication,
  onRemoveQuoted,
}) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [selectedGifs, setSelectedGifs] = useState<string[]>([]);
  const [showGifModal, setShowGifModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && selectedGifs.length === 0 && !quotedPublication) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      images.forEach((img) => formData.append('images', img));

      if (selectedGifs.length > 0) {
        const tenorData = selectedGifs.map((src, index) => ({ src, index }));
        formData.append('tenor', JSON.stringify(tenorData));
      }

      if (quotedPublication) {
        formData.append('target_id', quotedPublication.id);
        formData.append('type', 'quote');
      }

      await ApiClient.post('/publications', formData);
      setContent('');
      setImages([]);
      setSelectedGifs([]);
      onRemoveQuoted?.();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['explore-posts'] });
      onCreated?.();
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al publicar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
        <textarea
          autoFocus={autoFocus}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={quotedPublication ? 'Añade un comentario a la cita...' : '¿Qué estás pensando?'}
          rows={3}
          maxLength={500}
          className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans"
        />

        {quotedPublication && (
          <div className="relative mb-3 border border-dark-border p-2.5 bg-dark-card/50 text-xs">
            <button
              type="button"
              onClick={onRemoveQuoted}
              className="absolute top-2 right-2 text-dark-muted hover:text-white p-1"
              title="Quitar cita"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white">@{quotedPublication.author.username}</span>
              <span className="text-dark-muted text-[10px]">· {new Date(quotedPublication.created_at).toLocaleDateString()}</span>
            </div>
            {quotedPublication.content && (
              <p className="text-dark-text whitespace-pre-line leading-relaxed font-sans">{quotedPublication.content}</p>
            )}
            {quotedPublication.images && quotedPublication.images.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quotedPublication.images.map((img: any, i: number) => (
                  <img
                    key={i}
                    src={img.url}
                    alt=""
                    className="w-16 h-16 object-cover border border-dark-border"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {(images.length > 0 || selectedGifs.length > 0) && (
          <div className="flex flex-wrap gap-2 my-2">
            {images.map((img, i) => (
              <span key={i} className="text-xs bg-dark-card border border-dark-border px-2 py-1 text-brand-400 flex items-center gap-1">
                {img.name.slice(0, 12)}...
                <button type="button" onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}>
                  <X className="w-3 h-3 text-red-400 hover:text-white" />
                </button>
              </span>
            ))}
            {selectedGifs.map((gif, i) => (
              <div key={i} className="relative w-16 h-16 border border-dark-border overflow-hidden">
                <img src={gif} alt="GIF" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSelectedGifs((g) => g.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-black/80 text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-border">
          <div className="flex items-center gap-2 text-dark-muted">
            <label className="p-1.5 hover:text-brand-400 cursor-pointer transition-colors border border-transparent hover:border-dark-border">
              <Image className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 4))}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowGifModal(true)}
              className="p-1.5 hover:text-brand-400 transition-colors border border-transparent hover:border-dark-border"
            >
              <Film className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-dark-muted">
              {content.length}/500
            </span>
            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && images.length === 0 && selectedGifs.length === 0 && !quotedPublication)}
              className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </form>

      <KlipyGifModal
        isOpen={showGifModal}
        onClose={() => setShowGifModal(false)}
        onSelect={(url: string) => {
          setSelectedGifs([url]);
          setShowGifModal(false);
        }}
      />
    </>
  );
};
