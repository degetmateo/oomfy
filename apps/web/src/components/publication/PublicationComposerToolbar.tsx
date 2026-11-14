import React, { useRef, useState } from 'react';
import { Image, Film, Smile } from 'lucide-react';
import { LIMITS } from '@oomfy/shared';
import { KlipyGifModal } from './KlipyGifModal.js';
import { EmojiPickerMenu } from '../common/EmojiPickerMenu.js';
import { ImageCropperModal } from '../common/ImageCropperModal.js';

interface Props {
  content: string;
  onChangeContent: (val: string) => void;
  media: any;
  isSubmitting: boolean;
  hasContent: boolean;
  submitLabel: string;
  submittingLabel: string;
  cropTitle: string;
  compact?: boolean;
  onGifModalChange?: (open: boolean) => void;
}

export const PublicationComposerToolbar: React.FC<Props> = ({
  content,
  onChangeContent,
  media,
  isSubmitting,
  hasContent,
  submitLabel,
  submittingLabel,
  cropTitle,
  compact = false,
  onGifModalChange,
}) => {
  const [showGifModal, setShowGifModal] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const pad = compact ? 'p-1' : 'p-1.5';
  const toggleGifModal = (open: boolean) => { setShowGifModal(open); onGifModalChange?.(open); };

  return (
    <>
      <div className="flex items-center justify-between pt-2 border-t border-dark-border mt-2">
        <div className="flex items-center gap-2 text-dark-muted relative">
          <label className={`${pad} hover:text-brand-400 cursor-pointer transition-colors border border-transparent hover:border-dark-border`} title="Subir imagen/GIF">
            <Image className="w-4 h-4" aria-hidden="true" />
            <input type="file" accept="image/*" multiple aria-label="Subir imagen o GIF" className="hidden" onChange={(e) => { media.attachFiles(Array.from(e.target.files || [])); e.target.value = ''; e.target.blur(); }} />
          </label>
          <button type="button" onClick={() => toggleGifModal(true)} aria-label="Buscar GIF" className={`${pad} hover:text-brand-400 transition-colors border border-transparent hover:border-dark-border`} title="Buscar GIF">
            <Film className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="relative">
            <button ref={emojiBtnRef} type="button" onClick={() => setShowEmojiMenu((v) => !v)} aria-label="Emojis" aria-expanded={showEmojiMenu} className={`${pad} transition-colors border border-transparent hover:border-dark-border ${showEmojiMenu ? 'text-brand-400' : 'hover:text-brand-400'}`} title="Emojis">
              <Smile className="w-4 h-4" aria-hidden="true" />
            </button>
            <EmojiPickerMenu isOpen={showEmojiMenu} anchorRef={emojiBtnRef} onClose={() => setShowEmojiMenu(false)} onSelectEmoji={(emoji) => media.insertEmoji(emoji, content, onChangeContent)} position="bottom" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-dark-muted">{content.length}/{LIMITS.POST_CONTENT_MAX}</span>
          <button type="submit" disabled={isSubmitting || !hasContent || showGifModal || media.cropQueue.isCropping} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider pixel-button transition-colors">
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </div>
      <KlipyGifModal isOpen={showGifModal} onClose={() => toggleGifModal(false)} onSelect={(url: string) => { media.attachGifUrl(url); toggleGifModal(false); }} />
      <ImageCropperModal file={media.cropQueue.currentFile} isOpen={media.cropQueue.isCropping} aspectRatio={media.cropQueue.options.aspectRatio ?? 'free'} title={media.cropQueue.options.title ?? cropTitle} allowAspectChange={media.cropQueue.options.allowAspectChange ?? true} onCrop={media.cropQueue.handleCrop} onClose={media.cropQueue.handleClose} />
    </>
  );
};

