import React, { useLayoutEffect, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PixelAvatar } from './PixelAvatar.js';
import { AutocompleteItem } from '../../hooks/useComposerAutocomplete.js';

interface Props {
  isOpen: boolean;
  mode: 'emote' | 'mention' | null;
  items: AutocompleteItem[];
  activeIndex: number;
  isSearching: boolean;
  anchorRef: RefObject<HTMLTextAreaElement | null>;
  preferredPosition?: 'top' | 'bottom';
  onSelect: (index: number) => void;
  onHoverIndex: (index: number) => void;
}

export const ComposerAutocompleteMenu: React.FC<Props> = ({
  isOpen, mode, items, activeIndex, isSearching, anchorRef, preferredPosition = 'bottom', onSelect, onHoverIndex,
}) => {
  const [coords, setCoords] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || typeof window === 'undefined') { setCoords(null); return; }
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, Math.max(220, rect.width));
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceAbove = rect.top - 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openAbove = preferredPosition === 'top' ? spaceAbove >= 160 || spaceAbove > spaceBelow : spaceBelow < 180 && spaceAbove > spaceBelow;
      setCoords(openAbove
        ? { position: 'fixed', left, bottom: window.innerHeight - rect.top + 6, width, zIndex: 110 }
        : { position: 'fixed', left, top: rect.bottom + 6, width, zIndex: 110 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [isOpen, anchorRef, preferredPosition, items.length]);

  if (!isOpen || (items.length === 0 && !isSearching) || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="listbox"
      aria-label={mode === 'emote' ? 'Sugerencias de emotes' : 'Sugerencias de usuarios'}
      style={coords ?? { position: 'fixed', left: 16, bottom: 72, width: 280, zIndex: 110 }}
      className="bg-[#161616] border-2 border-dark-border shadow-pixel font-mono max-h-60 overflow-y-auto divide-y divide-dark-border/60"
    >
      {items.length === 0 && isSearching && (
        <div className="px-3 py-2 text-xs text-dark-muted">Buscando...</div>
      )}
      {items.map((item, idx) => {
        const active = idx === activeIndex;
        const rowClass = `w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${active ? 'bg-brand-500/20 text-brand-300' : 'text-white hover:bg-dark-card'}`;
        if (item.kind === 'emote') {
          return (
            <button key={item.emote.id} type="button" role="option" aria-selected={active} onMouseEnter={() => onHoverIndex(idx)} onMouseDown={(e) => { e.preventDefault(); onSelect(idx); }} className={rowClass}>
              <img src={item.emote.image_url} alt={`:${item.emote.name}:`} className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="font-bold truncate">:{item.emote.name}:</span>
            </button>
          );
        }
        return (
          <button key={item.user.id} type="button" role="option" aria-selected={active} onMouseEnter={() => onHoverIndex(idx)} onMouseDown={(e) => { e.preventDefault(); onSelect(idx); }} className={rowClass}>
            <PixelAvatar src={item.user.icon_url} username={item.user.username} sizeClass="w-6 h-6 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white truncate">{item.user.name}</div>
              <div className="text-[11px] text-dark-muted truncate">@{item.user.username}</div>
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );
};
