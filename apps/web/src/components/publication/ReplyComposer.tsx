import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, Film, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { KlipyGifModal } from './KlipyGifModal.js';

interface Props {
  targetId: string;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
}

export const ReplyComposer: React.FC<Props> = ({ targetId, onSubmit, isSubmitting }) => {
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [selectedGifs, setSelectedGifs] = useState<string[]>([]);
  const [showGifModal, setShowGifModal] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="p-3 sm:p-4 border-b border-dark-border flex items-center justify-between bg-dark-bg font-mono text-xs">
        <span className="text-dark-muted">Inicia sesión para responder a esta publicación.</span>
        <Link to="/signin" className="px-3 py-1 bg-brand-500 text-black font-bold pixel-button">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && selectedGifs.length === 0) return;

    const formData = new FormData();
    formData.append('type', 'reply');
    formData.append('target_id', targetId);
    if (content.trim()) formData.append('content', content.trim());
    images.forEach((img) => formData.append('images', img));

    if (selectedGifs.length > 0) {
      const tenorData = selectedGifs.map((src, index) => ({ src, index }));
      formData.append('tenor', JSON.stringify(tenorData));
    }

    onSubmit(formData);
    setContent('');
    setImages([]);
    setSelectedGifs([]);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Publicar tu respuesta..."
          maxLength={500}
          className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans"
        />

        {(images.length > 0 || selectedGifs.length > 0) && (
          <div className="flex flex-wrap gap-2 my-2">
            {images.map((img, i) => (
              <span key={i} className="text-xs bg-dark-card border border-dark-border px-2 py-1 text-brand-400 flex items-center gap-1">
                {img.name.slice(0, 10)}...
                <button type="button" onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}>
                  <X className="w-3 h-3 text-red-400 hover:text-white" />
                </button>
              </span>
            ))}
            {selectedGifs.map((gif, i) => (
              <div key={i} className="relative w-14 h-14 border border-dark-border overflow-hidden">
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

        <div className="flex items-center justify-between pt-2 border-t border-dark-border">
          <div className="flex items-center gap-2 text-dark-muted">
            <label className="p-1 hover:text-brand-400 cursor-pointer transition-colors border border-transparent hover:border-dark-border">
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
              className="p-1 hover:text-brand-400 transition-colors border border-transparent hover:border-dark-border"
            >
              <Film className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-dark-muted">{content.length}/500</span>
            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && images.length === 0 && selectedGifs.length === 0)}
              className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase pixel-button transition-colors"
            >
              {isSubmitting ? 'Respondiendo...' : 'Responder'}
            </button>
          </div>
        </div>
      </form>

      <KlipyGifModal
        isOpen={showGifModal}
        onClose={() => setShowGifModal(false)}
        onSelect={(url) => {
          setSelectedGifs((prev) => [...prev.slice(0, 3), url]);
          setShowGifModal(false);
        }}
      />
    </>
  );
};
