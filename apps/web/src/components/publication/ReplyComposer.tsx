import React, { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { LIMITS } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { PublicationComposerToolbar } from './PublicationComposerToolbar.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';

interface Props {
  targetId: string;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
}

export const ReplyComposer: React.FC<Props> = ({ targetId, onSubmit, isSubmitting }) => {
  const inputId = useId();
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState('');
  const media = useComposerMedia({ allowCrop: true, cropTitle: 'Recortar imagen de respuesta', maxGifs: 4, maxTotal: 4, maxLength: LIMITS.POST_CONTENT_MAX });

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
    setContent('');
    media.clearMedia();
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
      <label htmlFor={inputId} className="sr-only">Publicar tu respuesta</label>
      <textarea
        id={inputId}
        name="content"
        ref={media.attachTextareaRef}
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={media.handlePaste}
        placeholder="Publicar tu respuesta..."
        maxLength={LIMITS.POST_CONTENT_MAX}
        className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans"
      />
      <ComposerAttachmentPreviews files={media.files} gifs={media.gifs} onRemoveFile={media.removeFile} onRemoveGif={media.removeGif} />
      <PublicationComposerToolbar
        content={content}
        onChangeContent={setContent}
        media={media}
        isSubmitting={isSubmitting}
        hasContent={hasContent}
        submitLabel="Responder"
        submittingLabel="Respondiendo..."
        cropTitle="Recortar imagen de respuesta"
        compact
      />
    </form>
  );
};
