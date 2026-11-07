import React, { useState, useEffect, useRef } from 'react';
import { EMOJI_CATEGORIES } from '../../utils/emojiData.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  position?: 'top' | 'bottom';
}

export const EmojiPickerMenu: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  position = 'top',
}) => {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  const posClass = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      ref={containerRef}
      className={`absolute ${posClass} left-0 z-50 w-72 sm:w-80 bg-[#161616] border-2 border-dark-border shadow-pixel p-2 font-mono select-none`}
    >
      <div className="flex items-center justify-between border-b border-dark-border pb-1.5 mb-2 gap-1 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              activeCategory === cat.id
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'hover:bg-dark-card text-dark-muted hover:text-white'
            }`}
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
};

