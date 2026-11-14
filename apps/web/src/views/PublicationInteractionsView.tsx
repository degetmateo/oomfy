import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/layout/Header.js';
import { ApiClient } from '../services/api.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';
import {
  PublicationInteractionsTabs,
  INTERACTION_TABS,
  InteractionTab,
} from '../components/publication/PublicationInteractionsTabs.js';
import { PublicationInteractionsQuotesTab } from '../components/publication/PublicationInteractionsQuotesTab.js';
import { PublicationInteractionsUsersTab } from '../components/publication/PublicationInteractionsUsersTab.js';

export const PublicationInteractionsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as InteractionTab;
  const activeTab: InteractionTab = INTERACTION_TABS.includes(rawTab) ? rawTab : 'quotes';

  const { data } = useQuery({
    queryKey: ['publication-detail', id],
    queryFn: () => ApiClient.get<any>(`/publications/${id}`),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const author = data?.data?.publication?.author?.username;
  const subtitle = author ? `Publicación de @${author}` : undefined;

  const handleTabChange = (tab: InteractionTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const { touchHandlers } = useTabSwipe({
    tabs: INTERACTION_TABS,
    activeTab,
    onTabChange: handleTabChange,
  });

  if (!id) return null;

  return (
    <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
      <Header title="Interacciones" subtitle={subtitle} showBack />
      <PublicationInteractionsTabs activeTab={activeTab} onChangeTab={handleTabChange} />
      <div className="flex-1">
        {activeTab === 'quotes' && <PublicationInteractionsQuotesTab publicationId={id} />}
        {activeTab === 'shares' && <PublicationInteractionsUsersTab publicationId={id} type="shares" />}
        {activeTab === 'likes' && <PublicationInteractionsUsersTab publicationId={id} type="likes" />}
      </div>
    </div>
  );
};

