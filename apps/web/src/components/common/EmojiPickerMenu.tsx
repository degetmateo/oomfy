import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EMOJI_CATEGORIES } from '../../utils/emojiData.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  position?: 'top' | 'bottom';
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const EmojiPickerMenu: React.FC<Props> = ({ isOpen, onClose, onSelectEmoji, position = 'top', anchorRef }) => {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [coords, setCoords] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current || typeof window === 'undefined') { setCoords(null); return; }
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, Math.max(240, window.innerWidth - 16));
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceAbove = rect.top - 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openAbove = position === 'top' ? spaceAbove >= 220 || spaceAbove > spaceBelow : spaceBelow < 220 && spaceAbove > spaceBelow;
      setCoords(openAbove ? { position: 'fixed', left, bottom: window.innerHeight - rect.top + 8, width, zIndex: 90 }
        : { position: 'fixed', left, top: Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 270)), width, zIndex: 90 });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
  }, [isOpen, anchorRef, position]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  const fallbackPos = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const menu = (
    <div
      ref={containerRef}
      style={coords ?? undefined}
      className={`${coords ? '' : `absolute ${fallbackPos} left-0 z-[90] w-72 sm:w-80`} bg-[#161616] border-2 border-dark-border shadow-pixel p-2 font-mono select-none`}
    >
      <div className="flex items-center justify-between border-b border-dark-border pb-1.5 mb-2 gap-1 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-1 text-sm rounded transition-colors ${activeCategory === cat.id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'hover:bg-dark-card text-dark-muted hover:text-white'}`}
            title={cat.name}
          >
            <span className="text-base mr-1">{cat.icon}</span>
            <span className="text-[11px] font-bold hidden sm:inline">{cat.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 bg-dark-bg/60 rounded border border-dark-border/40">
        {currentCategory.emojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-dark-card/90 hover:scale-125 rounded transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  return anchorRef && typeof document !== 'undefined' ? createPortal(menu, document.body) : menu;
};
