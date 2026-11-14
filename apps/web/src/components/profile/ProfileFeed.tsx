import React from 'react';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../publication/PublicationCard.js';
import { PinnedPublicationItem } from './PinnedPublicationItem.js';
import { ProfileTab } from './ProfileTabs.js';

interface Props {
  activeTab: ProfileTab;
  posts: Publication[];
  pinnedPublication?: Publication | null;
  pinnedByName?: string;
  loadingPosts: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: React.Ref<HTMLDivElement>;
}

export const ProfileFeed: React.FC<Props> = ({
  activeTab,
  posts,
  pinnedPublication,
  pinnedByName,
  loadingPosts,
  isFetchingNextPage,
  loadMoreRef,
}) => {
  const showPinned = activeTab === 'posts' && Boolean(pinnedPublication);
  const displayedPosts = showPinned && pinnedPublication
    ? posts.filter((p) => p.id !== pinnedPublication.id)
    : posts;

  if (loadingPosts) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando publicaciones...</div>;
  }

  const hasAnyContent = showPinned || displayedPosts.length > 0;
  if (!hasAnyContent) {
    const emptyMsg = activeTab === 'posts'
      ? 'No hay publicaciones todavía.'
      : activeTab === 'replies'
      ? 'No hay respuestas todavía.'
      : 'No hay publicaciones que le gusten todavía.';
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">{emptyMsg}</div>;
  }

  return (
    <div className="divide-y divide-dark-border font-mono">
      {showPinned && pinnedPublication && (
        <PinnedPublicationItem post={pinnedPublication} pinnedByName={pinnedByName || 'usuario'} />
      )}
      {displayedPosts.map((post) => (
        <PublicationCard key={post.id} post={post} />
      ))}
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
      </div>
    </div>
  );
};
