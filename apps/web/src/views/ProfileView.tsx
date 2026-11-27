import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { Publication, PublicUser, SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { CachedTabPanel } from '../components/common/CachedTabPanel.js';
import { ProfileInfo } from '../components/profile/ProfileInfo.js';
import { ProfileInfoSkeleton } from '../components/profile/ProfileInfoSkeleton.js';
import { ProfileTabs, ProfileTab } from '../components/profile/ProfileTabs.js';
import { ProfileFeed } from '../components/profile/ProfileFeed.js';
import { EditProfileModal } from '../components/profile/EditProfileModal.js';
import { ImageViewerModal } from '../components/common/ImageViewerModal.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';
import { useUserModel } from '../hooks/useUserModel.js';
import { usePublicationModel } from '../hooks/usePublicationModel.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { RoutePrefetchService } from '../services/RoutePrefetchService.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';
import { useCloseOnViewInactive, useRevalidateOnViewResume } from '../contexts/ViewActivityContext.js';
import { useViewSearchParams } from '../hooks/useViewSearchParams.js';

const PROFILE_TABS: readonly ProfileTab[] = ['posts', 'replies', 'likes'];

const ProfileTabFeed: React.FC<{
  tab: ProfileTab;
  username: string;
  displayUsername: string;
  pinnedPublication?: Publication | null;
  pinnedByName?: string;
}> = ({ tab, username, displayUsername, pinnedPublication, pinnedByName }) => {
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    loadMoreRef,
  } = useCursorFeed({
    queryKey: ['user-posts', username, tab],
    buildUrl: (olderId) => {
      const p = new URLSearchParams({ limit: '20' });
      if (olderId) p.append('older_id', olderId);
      if (tab === 'likes' && displayUsername) p.append('liked_by', displayUsername);
      else if (displayUsername) {
        p.append('author_username', displayUsername);
        p.append('type', tab === 'replies' ? 'reply' : 'posts');
      }
      return `/publications?${p.toString()}`;
    },
    refetchOnMount: 'always',
    enabled: Boolean(username),
  });

  const visiblePosts =
    tab === 'likes' ? posts : posts.filter((p) => p?.author?.username?.toLowerCase() === username);

  return (
    <ProfileFeed
      activeTab={tab}
      posts={visiblePosts}
      pinnedPublication={pinnedPublication}
      pinnedByName={pinnedByName}
      loadingPosts={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      loadMoreRef={loadMoreRef}
    />
  );
};

interface ContentProps {
  username: string;
  displayUsername: string;
}

const ProfileViewContent: React.FC<ContentProps> = ({ username, displayUsername }) => {
  const [searchParams, setSearchParams] = useViewSearchParams();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  useCloseOnViewInactive(isEditOpen, () => setIsEditOpen(false));
  useCloseOnViewInactive(Boolean(zoomedImage), () => setZoomedImage(null));

  const tabParam = searchParams.get('tab');
  const activeTab: ProfileTab = tabParam === 'replies' || tabParam === 'likes' ? tabParam : 'posts';
  const handleTabChange = (tab: ProfileTab) => setSearchParams(tab === 'posts' ? {} : { tab }, { replace: true });
  const { touchHandlers } = useTabSwipe({ tabs: PROFILE_TABS, activeTab, onTabChange: handleTabChange });

  const {
    data: profile,
    isLoading: isLoadingProfile,
    isFetching: isFetchingProfile,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<{ success: boolean; data: PublicUser }>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const fetchedAt = Date.now();
      const res = await ApiClient.get<{ success: boolean; data: PublicUser }>(`/members/${displayUsername}`);
      if (res?.data) {
        userIdentityMap.ingest([res.data], fetchedAt, true);
      }
      return res;
    },
    placeholderData: () => {
      const cached =
        userIdentityMap.get(username) ||
        (currentUser && username && currentUser.username.toLowerCase() === username ? currentUser : undefined);
      return cached && cached.username.toLowerCase() === username ? { success: true, data: cached } : undefined;
    },
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    enabled: Boolean(username),
  });

  const isFetchingPosts = useIsFetching({ queryKey: ['user-posts', username] }) > 0;
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchProfile(),
      queryClient.refetchQueries({ queryKey: ['user-posts', username, activeTab] }),
    ]);
  }, [refetchProfile, queryClient, username, activeTab]);

  useRevalidateOnViewResume(handleRefresh, 60_000);

  const candidateUser = useUserModel(profile?.data || username) || profile?.data;
  const user =
    candidateUser && candidateUser.username?.toLowerCase() === username ? candidateUser : undefined;
  const pinnedSource = user?.pinned_publication || user?.pinned_publication_id || null;
  const resolvedPinned = usePublicationModel(pinnedSource);
  const pinnedPublication = pinnedSource
    ? (resolvedPinned || user?.pinned_publication || null)
    : null;
  const isOwnProfile = Boolean(
    currentUser && user && (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase())
  );
  const isThinProfile = Boolean(user && !user.publication_count && !user.follower_count && !user.bio);
  const headerSubtitle = user
    ? `${user.publication_count || 0} publicaciones`
    : isProfileError
      ? 'Perfil no disponible'
      : 'Cargando perfil...';

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={isEditOpen || Boolean(zoomedImage)}>
      <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
        {user && (
          <SeoHead
            title={`${user.name} (@${user.username}) — Perfil y Publicaciones | Oomfy`}
            description={(user.bio || `Mira las últimas publicaciones, fotos y actividad de ${user.name} (@${user.username}) en Oomfy.`).slice(0, 155)}
            canonicalPath={`/${user.username}`} ogImage={`${SITE_URL}/og/user/${user.username}`} ogType="profile" noIndex={isThinProfile}
            jsonLd={{ '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: user.name, alternateName: `@${user.username}`, description: user.bio || '', image: user.icon_url || `${SITE_URL}/og/user/${user.username}`, url: `${SITE_URL}/${user.username}` } }}
          />
        )}
        <Header
          title={user?.name || `@${displayUsername}`}
          subtitle={headerSubtitle}
          onRefresh={handleRefresh}
          isRefreshing={isFetchingProfile || isFetchingPosts}
        />
        <div
          onClick={() => user?.banner_url && setZoomedImage(user.banner_url)}
          className={`h-32 sm:h-40 bg-[#242424] relative overflow-hidden ${user?.banner_url ? 'cursor-pointer hover:opacity-95' : ''}`}
          title={user?.banner_url ? 'Ampliar portada' : undefined}
        >
          {user?.banner_url && (
            <img key={user.banner_url} src={resolveMediaUrl(user.banner_url) || ''} alt="Banner" className="w-full h-full object-cover" />
          )}
        </div>
        {!user && isLoadingProfile && <ProfileInfoSkeleton />}
        {!user && isProfileError && (
          <div className="p-6 border-b border-dark-border bg-dark-bg text-center font-mono">
            <p className="text-xs text-red-400">
              {(profileError as any)?.status === 404
                ? `Usuario @${displayUsername} no encontrado.`
                : `No se pudo cargar el perfil de @${displayUsername}.`}
            </p>
            <button
              type="button"
              onClick={() => void refetchProfile()}
              className="mt-3 px-4 py-1.5 text-xs font-bold border border-dark-border bg-dark-card hover:border-brand-500 text-white hover:text-brand-400 pixel-button transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
        {user && (
          <ProfileInfo
            key={`profile-info-${user.id || username}`}
            user={user}
            isOwnProfile={isOwnProfile}
            onEditClick={() => setIsEditOpen(true)}
            onAvatarClick={setZoomedImage}
          />
        )}
        {(!isProfileError || Boolean(user)) && (
          <>
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onPrefetchTab={(tab) => username && RoutePrefetchService.prefetchProfileTab(queryClient, username, tab)}
            />
            <div className="relative flex-1">
              {PROFILE_TABS.map((tab) => (
                <CachedTabPanel key={tab} active={activeTab === tab}>
                  <ProfileTabFeed
                    tab={tab}
                    username={username}
                    displayUsername={displayUsername}
                    pinnedPublication={pinnedPublication}
                    pinnedByName={user?.name}
                  />
                </CachedTabPanel>
              ))}
            </div>
          </>
        )}
        {isOwnProfile && isEditOpen && user && (
          <EditProfileModal key={`edit-profile-${user.id}`} user={user} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['profile'] }); PublicationCacheService.invalidatePublicationLists(queryClient); }} />
        )}
        <ImageViewerModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    </PullToRefresh>
  );
};

export const ProfileView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const rawUsername = username?.trim() || '';
  const normalizedUsername = rawUsername.toLowerCase();
  return <ProfileViewContent key={normalizedUsername} username={normalizedUsername} displayUsername={rawUsername || normalizedUsername} />;
};
