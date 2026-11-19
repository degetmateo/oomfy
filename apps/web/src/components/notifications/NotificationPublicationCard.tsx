import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { Publication } from '@oomfy/shared';
import { FormattedText } from '../common/FormattedText.js';
import { MediaGrid } from '../publication/MediaGrid.js';
import { LinkPreviewCard } from '../publication/LinkPreviewCard.js';
import { PublicationActions } from '../publication/PublicationActions.js';
import { ApiClient } from '../../services/api.js';
import { publicationIdentityMap } from '../../models/PublicationIdentityMap.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

const NotificationPublicationFetcher: React.FC<{ targetId: string }> = ({ targetId }) => {
  useQuery({
    queryKey: ['notification-pub', targetId],
    queryFn: async () => {
      const res = await ApiClient.get<any>(`/publications/${targetId}`);
      const pub: Publication | undefined = res?.data?.publication;
      if (pub) publicationIdentityMap.ingest([pub], Date.now());
      return pub || null;
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
  return null;
};

interface Props {
  publication?: Publication | null;
  targetId: string;
}

export const NotificationPublicationCard: React.FC<Props> = ({ publication: initialPub, targetId }) => {
  const navigate = useNavigate();
  const queryClient = useContext(QueryClientContext);
  const { isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const pub = usePublicationModel(initialPub || targetId) || initialPub;

  if (!pub) {
    return queryClient && targetId ? <NotificationPublicationFetcher targetId={targetId} /> : null;
  }

  return (
    <div className="mt-2 p-2.5 border border-dark-border bg-dark-bg/50 font-mono">
      {pub.content && (
        <FormattedText
          text={pub.content}
          authorId={pub.author?.id}
          className="text-xs text-dark-text whitespace-pre-line leading-relaxed font-sans block"
        />
      )}
      <MediaGrid images={pub.images || []} />
      <LinkPreviewCard embeds={pub.embeds} targetPublication={pub.type === 'quote' ? pub.target_publication : undefined} />
      <div className="mt-2 pt-1.5 border-t border-dark-border/60" onClick={(e) => e.stopPropagation()} data-no-card-nav="true">
        <PublicationActions
          postId={pub.id}
          initialUpvotes={Math.max(0, pub.upvotes_count || 0, pub.is_upvoted ? 1 : 0)}
          initialIsUpvoted={Boolean(pub.is_upvoted)}
          initialShares={Math.max(0, pub.shares_count || 0)}
          initialIsShared={Boolean(pub.is_shared)}
          initialIsQuoted={Boolean(pub.is_quoted)}
          quotesCount={Math.max(0, pub.quotes_count || 0)}
          commentsCount={Math.max(0, pub.comments_count || 0)}
          onCommentClick={() => navigate(`/publication/${pub.id}`)}
          onQuoteClick={() => (isAuthenticated ? openPostModal(pub) : navigate('/signin'))}
        />
      </div>
    </div>
  );
};
