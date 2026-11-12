import React, { useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LIMITS, Publication } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { PublicationQuotedPreview } from './PublicationQuotedPreview.js';
import { PublicationComposerToolbar } from './PublicationComposerToolbar.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';

interface Props {
  onCreated?: () => void;
  autoFocus?: boolean;
  quotedPublication?: Publication | null;
  onRemoveQuoted?: () => void;
}

export const PublicationCreator: React.FC<Props> = ({ onCreated, autoFocus = false, quotedPublication, onRemoveQuoted }) => {
  const queryClient = useQueryClient();
  const inputId = useId();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const media = useComposerMedia({ allowCrop: true, cropTitle: 'Recortar imagen', maxGifs: 4, maxTotal: 4, maxLength: LIMITS.POST_CONTENT_MAX });

  if (!isAuthenticated) return null;

  const hasContent = Boolean(content.trim() || media.files.length > 0 || media.gifs.length > 0 || quotedPublication);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      media.files.forEach((img) => formData.append('images', img));
      if (media.gifs.length > 0) formData.append('tenor', JSON.stringify(media.gifs.map((src, index) => ({ src, index }))));
      if (quotedPublication) { formData.append('target_id', quotedPublication.id); formData.append('type', 'quote'); }
      await ApiClient.post('/publications', formData);
      if (quotedPublication) {
        PublicationCacheService.applyPatch(queryClient, quotedPublication.id, (p) => ({ ...p, is_quoted: true, quotes_count: (p.quotes_count || 0) + 1 }), quotedPublication);
      }
      setContent('');
      media.clearMedia();
      onRemoveQuoted?.();
      PublicationCacheService.invalidatePublicationLists(queryClient);
      onCreated?.();
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al publicar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-b border-dark-border bg-dark-bg font-mono">
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
        maxLength={LIMITS.POST_CONTENT_MAX}
        className="w-full bg-transparent resize-none focus:outline-none text-white text-sm placeholder-dark-muted font-sans"
      />
      {quotedPublication && <PublicationQuotedPreview quotedPublication={quotedPublication} onRemove={onRemoveQuoted} />}
      <ComposerAttachmentPreviews files={media.files} gifs={media.gifs} onRemoveFile={media.removeFile} onRemoveGif={media.removeGif} />
      <PublicationComposerToolbar
        content={content}
        onChangeContent={setContent}
        media={media}
        isSubmitting={isSubmitting}
        hasContent={hasContent}
        submitLabel="Publicar"
        submittingLabel="Publicando..."
        cropTitle="Recortar imagen"
      />
    </form>
  );
};
