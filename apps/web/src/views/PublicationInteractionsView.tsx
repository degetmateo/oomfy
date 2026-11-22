import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/layout/Header.js';
import { CachedTabPanel } from '../components/common/CachedTabPanel.js';
import { ApiClient } from '../services/api.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { usePublicationModel } from '../hooks/usePublicationModel.js';
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
  const queryClient = useQueryClient();
  const rawTab = searchParams.get('tab') as InteractionTab;
  const activeTab: InteractionTab = INTERACTION_TABS.includes(rawTab) ? rawTab : 'quotes';
  const pub = usePublicationModel(id);

  const { data } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const fetchedAt = Date.now();
      const d = (await ApiClient.get<any>(`/publications/${id}`)).data;
      if (d?.publication) publicationIdentityMap.ingest([d.publication], fetchedAt);
      return d;
    },
    placeholderData: () => PublicationCacheService.getPlaceholderDetailData(queryClient, id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  const author = pub?.author?.username || data?.publication?.author?.username;
  const subtitle = author ? `Publicación de @${author}` : undefined;

  const handleTabChange = (tab: InteractionTab) => setSearchParams({ tab }, { replace: true });
  const { touchHandlers } = useTabSwipe({ tabs: INTERACTION_TABS, activeTab, onTabChange: handleTabChange });

  if (!id) return null;

  return (
    <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
      <Header title="Interacciones" subtitle={subtitle} showBack />
      <PublicationInteractionsTabs activeTab={activeTab} onChangeTab={handleTabChange} />
      <div className="flex-1 relative">
        <CachedTabPanel active={activeTab === 'quotes'}><PublicationInteractionsQuotesTab publicationId={id} /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'shares'}><PublicationInteractionsUsersTab publicationId={id} type="shares" /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'likes'}><PublicationInteractionsUsersTab publicationId={id} type="likes" /></CachedTabPanel>
      </div>
    </div>
  );
};
