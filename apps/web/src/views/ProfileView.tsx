import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicUser, SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { ProfileInfo } from '../components/profile/ProfileInfo.js';
import { ProfileTabs, ProfileTab } from '../components/profile/ProfileTabs.js';
import { ProfileFeed } from '../components/profile/ProfileFeed.js';
import { EditProfileModal } from '../components/profile/EditProfileModal.js';
import { ImageViewerModal } from '../components/common/ImageViewerModal.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';

const PROFILE_TABS: readonly ProfileTab[] = ['posts', 'replies', 'likes'];

export const ProfileView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const tabParam = searchParams.get('tab');
  const activeTab: ProfileTab = tabParam === 'replies' || tabParam === 'likes' ? tabParam : 'posts';
  const handleTabChange = (tab: ProfileTab) => setSearchParams(tab === 'posts' ? {} : { tab }, { replace: true });
  const { touchHandlers } = useTabSwipe({ tabs: PROFILE_TABS, activeTab, onTabChange: handleTabChange });

  const { data: profile, refetch: refetchProfile } = useQuery<{ success: boolean; data: PublicUser }>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await ApiClient.get<{ success: boolean; data: PublicUser }>(`/members/${username}`);
      if (res?.data) useEntityRegistryStore.getState().ingestUsers([res.data]);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(username),
  });

  const { posts, isLoading: loadingPosts, isFetchingNextPage, refetch: refetchPosts, loadMoreRef } = useCursorFeed({
    queryKey: ['user-posts', username, activeTab],
    buildUrl: (olderId) => {
      const p = new URLSearchParams({ limit: '20' });
      if (olderId) p.append('older_id', olderId);
      if (activeTab === 'likes' && username) p.append('liked_by', username);
      else if (username) { p.append('author_username', username); p.append('type', activeTab === 'replies' ? 'reply' : 'posts'); }
      return `/publications?${p.toString()}`;
    },
    enabled: Boolean(username),
  });

  const user = profile?.data;
  const isOwnProfile = Boolean(currentUser && user && (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase()));
  const handleRefresh = async () => { await Promise.all([refetchProfile(), refetchPosts()]); };
  const isThinProfile = Boolean(user && !user.publication_count && !user.follower_count && !user.bio);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
        {user && (
          <SeoHead
            title={`${user.name} (@${user.username}) — Perfil y Publicaciones | Oomfy`}
            description={(user.bio || `Mira las últimas publicaciones, fotos y actividad de ${user.name} (@${user.username}) en Oomfy.`).slice(0, 155)}
            canonicalPath={`/${user.username}`} ogImage={`${SITE_URL}/og/user/${user.username}`} ogType="profile" noIndex={isThinProfile}
            jsonLd={{ '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: user.name, alternateName: `@${user.username}`, description: user.bio || '', image: user.icon_url || `${SITE_URL}/og/user/${user.username}`, url: `${SITE_URL}/${user.username}` } }}
          />
        )}
        <Header title={user?.name || `@${username}`} subtitle={`${user?.publication_count || 0} publicaciones`} onRefresh={handleRefresh} />
        <div onClick={() => user?.banner_url && setZoomedImage(user.banner_url)} className={`h-32 sm:h-40 bg-[#242424] relative overflow-hidden ${user?.banner_url ? 'cursor-pointer hover:opacity-95' : ''}`} title={user?.banner_url ? 'Ampliar portada' : undefined}>
          {user?.banner_url && <img src={resolveMediaUrl(user.banner_url) || ''} alt="Banner" className="w-full h-full object-cover" />}
        </div>
        {user && <ProfileInfo user={user} isOwnProfile={isOwnProfile} onEditClick={() => setIsEditOpen(true)} onAvatarClick={setZoomedImage} />}
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <ProfileFeed
          activeTab={activeTab}
          posts={posts}
          pinnedPublication={user?.pinned_publication}
          pinnedByName={user?.name}
          loadingPosts={loadingPosts}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreRef={loadMoreRef}
        />
        {isOwnProfile && isEditOpen && user && (
          <EditProfileModal key={user.id} user={user} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['profile'] }); PublicationCacheService.invalidatePublicationLists(queryClient); }} />
        )}
        <ImageViewerModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    </PullToRefresh>
  );
};
