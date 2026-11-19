import React, { useContext } from 'react';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { Notification, Publication } from '@oomfy/shared';
import { PublicationCard } from '../publication/PublicationCard.js';
import { ApiClient } from '../../services/api.js';
import { publicationIdentityMap } from '../../models/PublicationIdentityMap.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { useAuthStore } from '../../stores/authStore.js';

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

function buildFallbackPublication(notif: Notification): Publication {
  return {
    id: notif.target_publication_id || notif.id,
    author: notif.sender,
    type: notif.type === 'comment' ? 'reply' : notif.type === 'quote' ? 'quote' : 'default',
    content: null,
    created_at: notif.created_at,
    parent_publication_id: null,
    root_publication_id: null,
    images: [],
    embeds: [],
    upvotes_count: 0,
    shares_count: 0,
    quotes_count: 0,
    comments_count: 0,
  };
}

interface Props {
  notif: Notification;
  isUnread: boolean;
}

export const NotificationPublicationCard: React.FC<Props> = ({ notif, isUnread }) => {
  const queryClient = useContext(QueryClientContext);
  const currentUser = useAuthStore((s) => s.user);
  const targetId = notif.target_publication_id;
  const livePub = usePublicationModel(notif.target_publication || targetId) || notif.target_publication;

  const basePost = livePub || buildFallbackPublication(notif);
  const postToRender: Publication =
    basePost.type === 'reply' && !basePost.target_publication && currentUser
      ? {
          ...basePost,
          target_publication: {
            ...basePost,
            id: basePost.parent_publication_id || basePost.id,
            author: {
              id: currentUser.id,
              username: currentUser.username,
              name: currentUser.name,
              role: currentUser.role,
              icon_url: currentUser.icon_url,
              banner_url: currentUser.banner_url,
            },
          },
        }
      : basePost;

  return (
    <div className={isUnread ? 'bg-brand-500/15 border-l-4 border-l-brand-400 relative' : 'relative'}>
      {!livePub && queryClient && targetId && <NotificationPublicationFetcher targetId={targetId} />}
      <PublicationCard post={postToRender} hideBottomBorder hideThreadPreview />
    </div>
  );
};
