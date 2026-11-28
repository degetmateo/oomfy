import React, { useState, useId, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LIMITS, Publication } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { ComposerDropFeedback, ComposerDropOverlay } from '../common/ComposerDropOverlay.js';
import { PublicationQuotedPreview } from './PublicationQuotedPreview.js';
import { PublicationComposerToolbar } from './PublicationComposerToolbar.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';
import { submitOptimisticPublication } from '../../controllers/optimisticPublicationHelpers.js';

interface Props {
  onCreated?: () => void;
  autoFocus?: boolean;
  quotedPublication?: Publication | null;
  onRemoveQuoted?: () => void;
}

export const PublicationCreator: React.FC<Props> = ({ onCreated, autoFocus = false, quotedPublication, onRemoveQuoted }) => {
  const queryClient = useQueryClient();
  const inputId = useId();
  const { isAuthenticated, user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isGifOpen, setIsGifOpen] = useState(false);
  const submittingRef = useRef(false);
  const maxLen = user?.role === 'admin' ? undefined : LIMITS.POST_CONTENT_MAX;
  const media = useComposerMedia({ allowCrop: true, cropTitle: 'Recortar imagen', maxGifs: 4, maxTotal: 4, maxLength: maxLen });

  if (!isAuthenticated) return null;

  const hasContent = Boolean(content.trim() || media.files.length > 0 || media.gifs.length > 0 || quotedPublication);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent || submittingRef.current || media.cropQueue.isCropping || isGifOpen) return;
    submittingRef.current = true;
    const trimmed = content.trim();
    const formData = new FormData();
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
    if (quotedPublication) { formData.append('target_id', quotedPublication.id); formData.append('type', 'quote'); }

    submitOptimisticPublication(
      queryClient,
      formData,
      user,
      {
        content: trimmed,
        files: [...media.files],
        gifs: [...media.gifs],
        fileWarnings: [...media.fileWarnings],
        gifWarnings: [...media.gifWarnings],
      },
      quotedPublication
    );
    setContent('');
    media.clearMedia();
    onRemoveQuoted?.();
    onCreated?.();
    submittingRef.current = false;
  };

  return (
    <form onSubmit={handleSubmit} {...media.dragProps} className="relative p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
      <ComposerDropOverlay
        isDragging={media.isDraggingMedia}
        remainingSlots={media.remainingSlots}
        maxTotal={media.maxTotal}
      />
      <label htmlFor={inputId} className="sr-only">
        {quotedPublication ? 'Añade un comentario' : '¿Qué estás pensando?'}
      </label>
      <textarea
        id={inputId}
        name="content"
        ref={media.attachTextareaRef}
        autoFocus={autoFocus}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={media.handlePaste}
        placeholder={quotedPublication ? 'Añade un comentario...' : '¿Qué estás pensando?'}
        rows={3}
        maxLength={maxLen}
        style={{ fieldSizing: 'content' } as React.CSSProperties}
        className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans min-h-[4.5rem] max-h-80 overflow-y-hidden"
      />
      {quotedPublication && <PublicationQuotedPreview quotedPublication={quotedPublication} onRemove={onRemoveQuoted} />}
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
        content={content} onChangeContent={setContent} media={media} isSubmitting={false}
        hasContent={hasContent} submitLabel="Publicar" submittingLabel="Publicando..." cropTitle="Recortar imagen"
        onGifModalChange={setIsGifOpen}
      />
    </form>
  );
};
