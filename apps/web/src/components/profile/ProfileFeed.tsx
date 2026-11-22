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

  if (loadingPosts && !showPinned) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando publicaciones...</div>;
  }

  if (loadingPosts && showPinned && pinnedPublication) {
    return (
      <div className="divide-y divide-dark-border font-mono">
        <PinnedPublicationItem post={pinnedPublication} pinnedByName={pinnedByName || 'usuario'} />
        <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando publicaciones...</div>
      </div>
    );
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
      {displayedPosts.map((post, idx) => (
        <PublicationCard key={post.id} post={post} index={showPinned ? idx + 1 : idx} hideThreadPreview={activeTab === 'likes'} />
      ))}
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
      </div>
    </div>
  );
};
