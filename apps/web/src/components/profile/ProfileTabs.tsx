import React from 'react';

export type ProfileTab = 'posts' | 'replies' | 'media' | 'likes';

interface Props {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onPrefetchTab?: (tab: ProfileTab) => void;
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'posts', label: 'Publicaciones' },
  { id: 'replies', label: 'Respuestas' },
  { id: 'media', label: 'Multimedia' },
  { id: 'likes', label: 'Me gusta' },
];

export const ProfileTabs: React.FC<Props> = ({ activeTab, onTabChange, onPrefetchTab }) => (
  <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60">
    {TABS.map(({ id, label }) => (
      <button
        key={id}
        onClick={() => onTabChange(id)}
        onMouseEnter={() => onPrefetchTab?.(id)}
        onTouchStart={() => onPrefetchTab?.(id)}
        className={`flex-1 px-1.5 sm:px-2 py-3 text-[11px] sm:text-sm font-bold tracking-wider whitespace-nowrap transition-colors ${
          activeTab === id
            ? 'text-brand-400 border-b-2 border-brand-400'
            : 'text-dark-muted hover:text-white border-b-2 border-transparent'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
