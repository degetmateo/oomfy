import React, { useState, useId, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LIMITS } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { ComposerDropFeedback, ComposerDropOverlay } from '../common/ComposerDropOverlay.js';
import { PublicationComposerToolbar } from './PublicationComposerToolbar.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';
import type { OptimisticMeta } from '../../controllers/optimisticPublicationHelpers.js';

interface Props {
  targetId: string;
  onSubmit: (data: FormData, meta: OptimisticMeta) => void;
  isSubmitting?: boolean;
}

export const ReplyComposer: React.FC<Props> = ({ targetId, onSubmit, isSubmitting = false }) => {
  const inputId = useId();
  const { isAuthenticated, user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isGifOpen, setIsGifOpen] = useState(false);
  const submittingRef = useRef(false);
  const maxLen = user?.role === 'admin' ? undefined : LIMITS.POST_CONTENT_MAX;
  const media = useComposerMedia({ allowCrop: true, cropTitle: 'Recortar imagen de respuesta', maxGifs: 4, maxTotal: 4, maxLength: maxLen });

  useEffect(() => {
    if (!isSubmitting) submittingRef.current = false;
  }, [isSubmitting]);

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
    if (!hasContent || isSubmitting || submittingRef.current || media.cropQueue.isCropping || isGifOpen) return;
    submittingRef.current = true;
    const trimmed = content.trim();
    const formData = new FormData();
    formData.append('type', 'reply');
    formData.append('target_id', targetId);
    if (trimmed) formData.append('content', trimmed);
    media.files.forEach((img) => formData.append('images', img));
    if (media.fileWarnings.some(Boolean)) {
      formData.append('image_warnings', JSON.stringify(media.fileWarnings));
    }
    if (media.gifs.length > 0) {
      formData.append(
        'tenor',
        JSON.stringify(
          media.gifs.map((src, index) => ({
            src,
            index,
            ...(media.gifWarnings[index] ? { warning: media.gifWarnings[index] } : {}),
          }))
        )
      );
    }
    onSubmit(formData, {
      content: trimmed,
      files: [...media.files],
      gifs: [...media.gifs],
      fileWarnings: [...media.fileWarnings],
      gifWarnings: [...media.gifWarnings],
    });
    setContent('');
    media.clearMedia();
    submittingRef.current = false;
  };

  return (
    <form onSubmit={handleSubmit} {...media.dragProps} className="relative p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
      <ComposerDropOverlay
        isDragging={media.isDraggingMedia}
        remainingSlots={media.remainingSlots}
        maxTotal={media.maxTotal}
      />
      <label htmlFor={inputId} className="sr-only">Publicar tu respuesta</label>
      <textarea
        id={inputId} name="content" ref={media.attachTextareaRef} rows={2} value={content}
        onChange={(e) => setContent(e.target.value)} onPaste={media.handlePaste}
        placeholder="Publicar tu respuesta..." maxLength={maxLen}
        style={{ fieldSizing: 'content' } as React.CSSProperties}
        className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans min-h-[3.25rem] max-h-80 overflow-y-hidden"
      />
      <ComposerDropFeedback message={media.dropFeedback} />
      <ComposerAttachmentPreviews
        files={media.files}
        gifs={media.gifs}
        fileWarnings={media.fileWarnings}
        gifWarnings={media.gifWarnings}
        onRemoveFile={media.removeFile}
        onRemoveGif={media.removeGif}
        onChangeFileWarning={media.setFileWarning}
        onChangeGifWarning={media.setGifWarning}
      />
      <PublicationComposerToolbar
        content={content} onChangeContent={setContent} media={media} isSubmitting={isSubmitting}
        hasContent={hasContent} submitLabel="Responder" submittingLabel="Respondiendo..."
        cropTitle="Recortar imagen de respuesta" compact onGifModalChange={setIsGifOpen}
      />
    </form>
  );
};
