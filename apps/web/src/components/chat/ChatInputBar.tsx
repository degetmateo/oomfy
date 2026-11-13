import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Film, Smile } from 'lucide-react';
import { KlipyGifModal } from '../publication/KlipyGifModal.js';
import { EmojiPickerMenu } from '../common/EmojiPickerMenu.js';
import { ChatReplyBanner } from './ChatReplyBanner.js';
import { ComposerAttachmentPreviews } from '../common/ComposerAttachmentPreviews.js';
import { useComposerMedia } from '../../hooks/useComposerMedia.js';

export interface OutgoingChatPayload {
  content: string; files: File[]; gifUrl: string | null; replyToId: string | null; replyTo?: any | null;
}

interface Props {
  replyingTo: any | null;
  onCancelReply: () => void;
  onSendMessage: (payload: OutgoingChatPayload) => Promise<void> | void;
  onTyping: () => void;
  onFocus?: () => void;
  isSending?: boolean;
}

export const ChatInputBar: React.FC<Props> = ({ replyingTo, onCancelReply, onSendMessage, onTyping, onFocus }) => {
  const [content, setContent] = useState('');
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const media = useComposerMedia({ allowCrop: false, maxGifs: 1, maxTotal: 4 });

  useEffect(() => {
    const el = media.textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 112)}px`; }
  }, [content, media.textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (e.key === 'Enter' && !isTouch && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const hasPayload = Boolean(content.trim() || media.files.length > 0 || media.gifs.length > 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasPayload) return;
    const payload: OutgoingChatPayload = {
      content: content.trim(),
      files: [...media.files],
      gifUrl: media.gifs[0] || null,
      replyToId: replyingTo?.id || null,
      replyTo: replyingTo,
    };
    setContent(''); media.clearMedia(); onCancelReply();
    if (media.textareaRef.current) media.textareaRef.current.style.height = 'auto';
    void onSendMessage(payload);
  };

  return (
    <div className="chat-input-bar-container border-t border-dark-border bg-dark-bg flex flex-col flex-shrink-0 font-mono relative pb-[env(safe-area-inset-bottom)]">
      <ChatReplyBanner replyingTo={replyingTo} onCancel={onCancelReply} />
      <ComposerAttachmentPreviews variant="compact" files={media.files} gifs={media.gifs} onRemoveFile={media.removeFile} onRemoveGif={media.removeGif} />
      <form onSubmit={handleSubmit} className="p-2 sm:p-2.5 flex items-end gap-1.5 sm:gap-2 relative">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { media.attachFiles(Array.from(e.target.files || [])); e.target.value = ''; }} className="hidden" aria-label="Adjuntar imagen" />
        <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={media.files.length + media.gifs.length >= 4} className="p-1.5 sm:p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40" title="Adjuntar imagen" aria-label="Adjuntar imagen">
              <Image className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setIsGifModalOpen(true)} disabled={media.gifs.length > 0} className="p-1.5 sm:p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40" title="Buscar GIF" aria-label="Buscar GIF">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex items-center justify-center">
            <button ref={emojiBtnRef} type="button" onClick={() => setIsEmojiOpen((v) => !v)} aria-expanded={isEmojiOpen} className={`p-1.5 sm:p-2.5 rounded transition-colors ${isEmojiOpen ? 'text-brand-400 bg-dark-card' : 'text-dark-muted hover:text-brand-400 hover:bg-dark-card'}`} title="Emojis" aria-label="Emojis">
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
            <EmojiPickerMenu isOpen={isEmojiOpen} anchorRef={emojiBtnRef} onClose={() => setIsEmojiOpen(false)} onSelectEmoji={(emoji) => media.insertEmoji(emoji, content, setContent)} position="top" />
          </div>
        </div>
        <label htmlFor="chat-message-input" className="sr-only">Escribe un mensaje</label>
        <textarea id="chat-message-input" name="message" enterKeyHint="send" ref={media.attachTextareaRef} rows={1} value={content} onChange={(e) => { setContent(e.target.value); onTyping(); }} onKeyDown={handleKeyDown} onPaste={media.handlePaste} onFocus={() => { onFocus?.(); setTimeout(() => media.textareaRef.current?.scrollIntoView({ block: 'nearest' }), 100); }} placeholder="Escribe un mensaje..." className="flex-1 min-w-0 px-3 py-2.5 bg-dark-card border border-dark-border text-base text-white focus:outline-none focus:border-brand-500 font-sans resize-none max-h-28 overflow-y-auto leading-relaxed" />
        <button type="submit" disabled={!hasPayload} aria-label="Enviar mensaje" className="px-3.5 sm:px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center font-mono flex-shrink-0">
          <Send className="w-5 h-5" aria-hidden="true" />
        </button>
      </form>
      <KlipyGifModal isOpen={isGifModalOpen} onClose={() => setIsGifModalOpen(false)} onSelect={(url) => { media.attachGifUrl(url); setIsGifModalOpen(false); }} />
    </div>
  );
};
