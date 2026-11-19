import React, { useState, useEffect, useLayoutEffect, useRef, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { EMOJI_CATEGORIES, filterEmojiCategories } from '../../utils/emojiData.js';
import { EmojiPickerEmotesSection, useFilteredUserEmotes } from './EmojiPickerEmotesSection.js';

interface Props {
  isOpen: boolean; onClose: () => void; onSelectEmoji: (emoji: string) => void;
  position?: 'top' | 'bottom'; anchorRef?: React.RefObject<HTMLElement | null>;
}

export const EmojiPickerMenu: React.FC<Props> = ({ isOpen, onClose, onSelectEmoji, position = 'top', anchorRef }) => {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputId = useId();
  const matchingEmotes = useFilteredUserEmotes(searchQuery);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current || typeof window === 'undefined') { setCoords(null); return; }
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(340, Math.max(250, window.innerWidth - 16));
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceAbove = rect.top - 8, spaceBelow = window.innerHeight - rect.bottom - 8;
      const openAbove = position === 'top' ? spaceAbove >= 280 || spaceAbove > spaceBelow : spaceBelow < 280 && spaceAbove > spaceBelow;
      setCoords(openAbove ? { position: 'fixed', left, bottom: window.innerHeight - rect.top + 8, width, zIndex: 90 }
        : { position: 'fixed', left, top: Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 320)), width, zIndex: 90 });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition); window.addEventListener('scroll', updatePosition, true);
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
  }, [isOpen, anchorRef, position]);

  useEffect(() => {
    if (!isOpen) { setSearchQuery(''); return; }
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !anchorRef?.current?.contains(t)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('mousedown', handleOutside); document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleOutside); document.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose, anchorRef]);

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => (isSearching ? filterEmojiCategories(searchQuery) : []), [isSearching, searchQuery]);
  if (!isOpen) return null;

  const currentCat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  const sections = isSearching ? searchResults : [{ id: currentCat.id, name: currentCat.name, items: currentCat.items }];
  const showEmotes = isSearching || activeCategory === EMOJI_CATEGORIES[0].id;
  const hasAnyResults = (showEmotes && matchingEmotes.length > 0) || sections.some((s) => s.items.length > 0);
  const fallbackPos = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  const menu = (
    <div ref={containerRef} style={coords ?? undefined} className={`${coords ? '' : `absolute ${fallbackPos} left-0 z-[90] w-72 sm:w-80`} bg-[#161616] border-2 border-dark-border shadow-pixel p-2 font-mono select-none`}>
      <div className="relative mb-2">
        <label htmlFor={searchInputId} className="sr-only">Buscar emoji</label>
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-dark-muted" aria-hidden="true" />
        <input id={searchInputId} type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar emoji..." aria-label="Buscar emoji" className="w-full pl-8 pr-7 py-1 bg-dark-bg border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans" />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1.5 text-dark-muted hover:text-white"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
        )}
      </div>
      <div className="flex items-center border-b border-dark-border pb-1.5 mb-2 gap-1 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => { setSearchQuery(''); setActiveCategory(cat.id); }} className={`px-2 py-1 text-sm rounded flex-shrink-0 transition-colors ${!isSearching && activeCategory === cat.id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'hover:bg-dark-card text-dark-muted hover:text-white'}`} title={cat.name} aria-label={cat.name}>
            <span className="text-base" aria-hidden="true">{cat.icon}</span>
          </button>
        ))}
      </div>
      <div className="max-h-60 overflow-y-auto p-1 bg-dark-bg/60 rounded border border-dark-border/40">
        {showEmotes && <EmojiPickerEmotesSection emotes={matchingEmotes} onSelectEmote={onSelectEmoji} />}
        {sections.map((sec) => (
          <div key={sec.id} className="mb-2 last:mb-0">
            <div className="text-[10px] uppercase font-bold text-dark-muted px-1 py-0.5 tracking-wider">{sec.name}</div>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
              {sec.items.map((item) => (
                <button key={`${sec.id}-${item.emoji}`} type="button" title={item.name} aria-label={item.name} onClick={() => onSelectEmoji(item.emoji)} className="w-9 h-9 flex items-center justify-center text-xl hover:bg-dark-card/90 hover:scale-125 rounded transition-transform cursor-pointer">
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!hasAnyResults && <div className="py-6 text-center text-xs text-dark-muted">No se encontraron emojis.</div>}
      </div>
    </div>
  );

  return anchorRef && typeof document !== 'undefined' ? createPortal(menu, document.body) : menu;
};
