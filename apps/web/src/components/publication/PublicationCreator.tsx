import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image, Film, Smile } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { KlipyGifModal } from './KlipyGifModal.js';
import { EmojiPickerMenu } from '../common/EmojiPickerMenu.js';
import { ImageCropperModal } from '../common/ImageCropperModal.js';
import { useImageCropQueue } from '../../hooks/useImageCropQueue.js';
import { PublicationQuotedPreview } from './PublicationQuotedPreview.js';
import { PublicationAttachmentPreviews } from './PublicationAttachmentPreviews.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';

interface Props {
  onCreated?: () => void;
  autoFocus?: boolean;
  quotedPublication?: Publication | null;
  onRemoveQuoted?: () => void;
}

export const PublicationCreator: React.FC<Props> = ({ onCreated, autoFocus = false, quotedPublication, onRemoveQuoted }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [selectedGifs, setSelectedGifs] = useState<string[]>([]);
  const [showGifModal, setShowGifModal] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cropQueue = useImageCropQueue((cropped) => setImages((prev) => [...prev, ...cropped].slice(0, 4)));
  if (!isAuthenticated) return null;

  const handleFiles = (files: File[]) => {
    const gifs = files.filter((f) => f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif'));
    const nonGifs = files.filter((f) => f.type !== 'image/gif' && !f.name.toLowerCase().endsWith('.gif'));
    const remaining = 4 - images.length;
    if (gifs.length > 0) setImages((p) => [...p, ...gifs].slice(0, 4));
    if (nonGifs.length > 0 && remaining - gifs.length > 0) {
      cropQueue.startCropping(nonGifs.slice(0, remaining - gifs.length), { title: 'Recortar imagen', aspectRatio: 'free', allowAspectChange: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && selectedGifs.length === 0 && !quotedPublication) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      images.forEach((img) => formData.append('images', img));
      if (selectedGifs.length > 0) formData.append('tenor', JSON.stringify(selectedGifs.map((src, index) => ({ src, index }))));
      if (quotedPublication) { formData.append('target_id', quotedPublication.id); formData.append('type', 'quote'); }
      await ApiClient.post('/publications', formData);
      if (quotedPublication) {
        PublicationCacheService.applyPatch(queryClient, quotedPublication.id, (p) => ({ ...p, is_quoted: true, quotes_count: (p.quotes_count || 0) + 1 }), quotedPublication);
      }
      setContent(''); setImages([]); setSelectedGifs([]); onRemoveQuoted?.();
      PublicationCacheService.invalidatePublicationLists(queryClient);
      onCreated?.();
    } catch (err) { dialog.alert((err as Error).message, 'Error al publicar'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
        <textarea autoFocus={autoFocus} value={content} onChange={(e) => setContent(e.target.value)} placeholder={quotedPublication ? 'Añade un comentario...' : '¿Qué estás pensando?'} rows={3} maxLength={500} className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans" />
        {quotedPublication && <PublicationQuotedPreview quotedPublication={quotedPublication} onRemove={onRemoveQuoted} />}
        <PublicationAttachmentPreviews images={images} selectedGifs={selectedGifs} onRemoveImage={(i) => setImages((p) => p.filter((_, idx) => idx !== i))} onRemoveGif={(i) => setSelectedGifs((g) => g.filter((_, idx) => idx !== i))} />
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-border">
          <div className="flex items-center gap-2 text-dark-muted relative">
            <label className="p-1.5 hover:text-brand-400 cursor-pointer transition-colors border border-transparent hover:border-dark-border" title="Subir imagen/GIF">
              <Image className="w-4 h-4" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => setShowGifModal(true)} className="p-1.5 hover:text-brand-400 transition-colors border border-transparent hover:border-dark-border" title="Buscar GIF"><Film className="w-4 h-4" /></button>
            <div className="relative">
              <button type="button" onClick={() => setShowEmojiMenu((v) => !v)} className={`p-1.5 transition-colors border border-transparent hover:border-dark-border ${showEmojiMenu ? 'text-brand-400' : 'hover:text-brand-400'}`} title="Emojis"><Smile className="w-4 h-4" /></button>
              <EmojiPickerMenu isOpen={showEmojiMenu} onClose={() => setShowEmojiMenu(false)} onSelectEmoji={(emoji) => setContent((c) => c + emoji)} position="bottom" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-dark-muted">{content.length}/500</span>
            <button type="submit" disabled={isSubmitting || (!content.trim() && images.length === 0 && selectedGifs.length === 0 && !quotedPublication)} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors">
              {isSubmitting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </form>
      <KlipyGifModal isOpen={showGifModal} onClose={() => setShowGifModal(false)} onSelect={(url: string) => { setSelectedGifs([url]); setShowGifModal(false); }} />
      <ImageCropperModal file={cropQueue.currentFile} isOpen={cropQueue.isCropping} aspectRatio={cropQueue.options.aspectRatio ?? 'free'} title={cropQueue.options.title ?? 'Recortar imagen'} allowAspectChange={cropQueue.options.allowAspectChange ?? true} onCrop={cropQueue.handleCrop} onClose={cropQueue.handleClose} />
    </>
  );
};
