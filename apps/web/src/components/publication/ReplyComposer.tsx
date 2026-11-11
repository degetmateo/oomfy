import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Image, Film, Smile } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { KlipyGifModal } from './KlipyGifModal.js';
import { EmojiPickerMenu } from '../common/EmojiPickerMenu.js';
import { ImageCropperModal } from '../common/ImageCropperModal.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';

interface Props {
  targetId: string;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
}

export const ReplyComposer: React.FC<Props> = ({ targetId, onSubmit, isSubmitting }) => {
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState('');
  const [showGifModal, setShowGifModal] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const media = useComposerMedia({ allowCrop: true, cropTitle: 'Recortar imagen de respuesta', maxGifs: 4, maxTotal: 4, maxLength: 500 });

  if (!isAuthenticated) {
    return (
      <div className="p-3 sm:p-4 border-b border-dark-border flex items-center justify-between bg-dark-bg font-mono text-xs">
        <span className="text-dark-muted">Inicia sesión para responder a esta publicación.</span>
        <Link to="/signin" className="px-3 py-1 bg-brand-500 text-black font-bold pixel-button">Iniciar sesión</Link>
      </div>
    );
  }

  const hasContent = Boolean(content.trim() || media.files.length > 0 || media.gifs.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent) return;
    const formData = new FormData();
    formData.append('type', 'reply');
    formData.append('target_id', targetId);
    if (content.trim()) formData.append('content', content.trim());
    media.files.forEach((img) => formData.append('images', img));
    if (media.gifs.length > 0) formData.append('tenor', JSON.stringify(media.gifs.map((src, index) => ({ src, index }))));
    onSubmit(formData);
    setContent(''); media.clearMedia();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
        <textarea ref={media.attachTextareaRef} rows={2} value={content} onChange={(e) => setContent(e.target.value)} onPaste={media.handlePaste} placeholder="Publicar tu respuesta..." maxLength={500} className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans" />
        <ComposerAttachmentPreviews files={media.files} gifs={media.gifs} onRemoveFile={media.removeFile} onRemoveGif={media.removeGif} />
        <div className="flex items-center justify-between pt-2 border-t border-dark-border">
          <div className="flex items-center gap-2 text-dark-muted relative">
            <label className="p-1 hover:text-brand-400 cursor-pointer transition-colors border border-transparent hover:border-dark-border" title="Subir imagen/GIF">
              <Image className="w-4 h-4" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { media.attachFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => setShowGifModal(true)} className="p-1 hover:text-brand-400 transition-colors border border-transparent hover:border-dark-border" title="Buscar GIF"><Film className="w-4 h-4" /></button>
            <div className="relative">
              <button ref={emojiBtnRef} type="button" onClick={() => setShowEmojiMenu((v) => !v)} className={`p-1 transition-colors border border-transparent hover:border-dark-border ${showEmojiMenu ? 'text-brand-400' : 'hover:text-brand-400'}`} title="Emojis"><Smile className="w-4 h-4" /></button>
              <EmojiPickerMenu isOpen={showEmojiMenu} anchorRef={emojiBtnRef} onClose={() => setShowEmojiMenu(false)} onSelectEmoji={(emoji) => media.insertEmoji(emoji, content, setContent)} position="bottom" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-dark-muted">{content.length}/500</span>
            <button type="submit" disabled={isSubmitting || !hasContent} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase pixel-button transition-colors">
              {isSubmitting ? 'Respondiendo...' : 'Responder'}
            </button>
          </div>
        </div>
      </form>
      <KlipyGifModal isOpen={showGifModal} onClose={() => setShowGifModal(false)} onSelect={(url) => { media.attachGifUrl(url); setShowGifModal(false); }} />
      <ImageCropperModal file={media.cropQueue.currentFile} isOpen={media.cropQueue.isCropping} aspectRatio={media.cropQueue.options.aspectRatio ?? 'free'} title={media.cropQueue.options.title ?? 'Recortar imagen'} allowAspectChange={media.cropQueue.options.allowAspectChange ?? true} onCrop={media.cropQueue.handleCrop} onClose={media.cropQueue.handleClose} />
    </>
  );
};
