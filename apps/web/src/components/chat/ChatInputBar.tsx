import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Film, X, CornerDownRight } from 'lucide-react';
import { KlipyGifModal } from '../publication/KlipyGifModal.js';

interface Props {
  replyingTo: any | null;
  onCancelReply: () => void;
  onSendMessage: (payload: { content: string; files: File[]; gifUrl: string | null; replyToId: string | null }) => Promise<void>;
  onTyping: () => void;
  isSending: boolean;
}

export const ChatInputBar: React.FC<Props> = ({
  replyingTo,
  onCancelReply,
  onSendMessage,
  onTyping,
  isSending,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 112)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (isTouchDevice || e.shiftKey) return;
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 4 - files.length);
      setFiles((prev) => [...prev, ...selected].slice(0, 4));
    }
    e.target.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if ((!trimmed && files.length === 0 && !gifUrl) || isSending) return;

    await onSendMessage({
      content: trimmed,
      files,
      gifUrl,
      replyToId: replyingTo?.id || null,
    });

    setContent('');
    setFiles([]);
    setGifUrl(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="border-t border-dark-border bg-dark-bg flex flex-col flex-shrink-0 font-mono">
      {replyingTo && (
        <div className="px-3 py-1.5 bg-dark-card/60 border-b border-dark-border/60 flex items-center justify-between text-xs text-dark-muted">
          <div className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span>Respondiendo a <strong className="text-white">@{replyingTo.sender?.username}</strong>:</span>
            <span className="truncate italic max-w-xs">{replyingTo.content || '(archivo adjunto)'}</span>
          </div>
          <button type="button" onClick={onCancelReply} className="p-0.5 hover:text-white text-dark-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {(files.length > 0 || gifUrl) && (
        <div className="p-2 border-b border-dark-border/40 flex items-center gap-2 overflow-x-auto bg-dark-bg/80">
          {files.map((file, i) => (
            <div key={i} className="relative w-14 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 bg-black/80 text-white p-0.5 rounded-bl hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {gifUrl && (
            <div className="relative w-20 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0">
              <img src={gifUrl} alt="gif preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setGifUrl(null)}
                className="absolute top-0 right-0 bg-black/80 text-white p-0.5 rounded-bl hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-2 sm:p-2.5 flex items-end gap-1.5 sm:gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= 4}
          className="p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40"
          title="Adjuntar imagen (máx 4)"
        >
          <Image className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsGifModalOpen(true)}
          disabled={Boolean(gifUrl)}
          className="p-2.5 text-dark-muted hover:text-brand-400 hover:bg-dark-card rounded transition-colors disabled:opacity-40"
          title="Buscar GIF"
        >
          <Film className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3.5 py-2.5 bg-dark-card border border-dark-border text-base md:text-base text-white focus:outline-none focus:border-brand-500 font-sans resize-none max-h-28 overflow-y-auto leading-relaxed"
        />

        <button
          type="submit"
          disabled={isSending || (!content.trim() && files.length === 0 && !gifUrl)}
          className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center font-mono"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      <KlipyGifModal isOpen={isGifModalOpen} onClose={() => setIsGifModalOpen(false)} onSelect={(url) => setGifUrl(url)} />
    </div>
  );
};

