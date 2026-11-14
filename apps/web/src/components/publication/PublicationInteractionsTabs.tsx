import React from 'react';

export type InteractionTab = 'quotes' | 'shares' | 'likes';

export const INTERACTION_TABS: readonly InteractionTab[] = ['quotes', 'shares', 'likes'];

const TAB_LABELS: Record<InteractionTab, string> = {
  quotes: 'Citados',
  shares: 'Compartidos',
  likes: 'Me gusta',
};

interface Props {
  activeTab: InteractionTab;
  onChangeTab: (tab: InteractionTab) => void;
}

export const PublicationInteractionsTabs: React.FC<Props> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60 font-mono">
      {INTERACTION_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChangeTab(tab)}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors border-b-2 ${
            activeTab === tab
              ? 'text-brand-400 border-brand-400'
              : 'text-dark-muted hover:text-white border-transparent'
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
};

