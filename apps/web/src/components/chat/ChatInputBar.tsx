import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Film, Smile } from 'lucide-react';
import { KlipyGifModal } from '../publication/KlipyGifModal.js';
import { EmojiPickerMenu } from '../common/EmojiPickerMenu.js';
import { ChatReplyBanner } from './ChatReplyBanner.js';
import { ChatAttachmentPreviews } from './ChatAttachmentPreviews.js';

interface Props {
  replyingTo: any | null;
  onCancelReply: () => void;
  onSendMessage: (payload: { content: string; files: File[]; gifUrl: string | null; replyToId: string | null }) => Promise<void>;
  onTyping: () => void;
  isSending: boolean;
}

export const ChatInputBar: React.FC<Props> = ({
  replyingTo, onCancelReply, onSendMessage, onTyping, isSending,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 112)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (e.key === 'Enter' && !isTouch && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 4 - files.length);
      setFiles((prev) => [...prev, ...selected].slice(0, 4));
    }
    e.target.value = '';
  };

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const [start, end] = [el.selectionStart || 0, el.selectionEnd || 0];
      setContent(content.slice(0, start) + emoji + content.slice(end));
      setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if ((!trimmed && files.length === 0 && !gifUrl) || isSending) return;
    await onSendMessage({ content: trimmed, files, gifUrl, replyToId: replyingTo?.id || null });
    setContent('');
    setFiles([]);
    setGifUrl(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="border-t border-dark-border bg-dark-bg flex flex-col flex-shrink-0 font-mono relative">
      <ChatReplyBanner replyingTo={replyingTo} onCancel={onCancelReply} />
      <ChatAttachmentPreviews files={files} gifUrl={gifUrl} onRemoveFile={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))} onRemoveGif={() => setGifUrl(null)} />
      <form onSubmit={handleSubmit} className="p-2 sm:p-2.5 flex items-end gap-1.5 sm:gap-2 relative">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={files.length >= 4} className="p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40" title="Adjuntar imagen">
          <Image className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => setIsGifModalOpen(true)} disabled={Boolean(gifUrl)} className="p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40" title="Buscar GIF">
          <Film className="w-5 h-5" />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setIsEmojiOpen((v) => !v)} className={`p-2.5 rounded transition-colors ${isEmojiOpen ? 'text-brand-400 bg-dark-card' : 'text-dark-muted hover:text-brand-400 hover:bg-dark-card'}`} title="Emojis">
            <Smile className="w-5 h-5" />
          </button>
          <EmojiPickerMenu isOpen={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} onSelectEmoji={handleInsertEmoji} position="top" />
        </div>
        <textarea ref={textareaRef} rows={1} value={content} onChange={(e) => { setContent(e.target.value); onTyping(); }} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." className="flex-1 px-3.5 py-2.5 bg-dark-card border border-dark-border text-base text-white focus:outline-none focus:border-brand-500 font-sans resize-none max-h-28 overflow-y-auto leading-relaxed" />
        <button type="submit" disabled={isSending || (!content.trim() && files.length === 0 && !gifUrl)} className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center font-mono">
          <Send className="w-5 h-5" />
        </button>
      </form>
      <KlipyGifModal isOpen={isGifModalOpen} onClose={() => setIsGifModalOpen(false)} onSelect={(url) => setGifUrl(url)} />
    </div>
  );
};
