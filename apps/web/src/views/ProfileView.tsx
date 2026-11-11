import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicUser, SITE_URL } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { SeoHead } from '../components/common/SeoHead.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ProfileInfo } from '../components/profile/ProfileInfo.js';
import { EditProfileModal } from '../components/profile/EditProfileModal.js';
import { ImageViewerModal } from '../components/common/ImageViewerModal.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useCursorFeed } from '../hooks/useCursorFeed.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';

type ProfileTab = 'posts' | 'replies' | 'likes';

export const ProfileView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const tabParam = searchParams.get('tab');
  const activeTab: ProfileTab = tabParam === 'replies' || tabParam === 'likes' ? tabParam : 'posts';

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
      <div className="flex flex-col min-h-screen font-mono">
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
        <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60">
          {(['posts', 'replies', 'likes'] as const).map((tab) => (
            <button key={tab} onClick={() => setSearchParams(tab === 'posts' ? {} : { tab }, { replace: true })} className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-dark-muted hover:text-white border-b-2 border-transparent'}`}>
              {tab === 'posts' ? 'Publicaciones' : tab === 'replies' ? 'Respuestas' : 'Me gusta'}
            </button>
          ))}
        </div>
        <div className="divide-y divide-dark-border">
          {loadingPosts ? <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones...</div> : posts.length > 0 ? (
            <>
              {posts.map((post) => <PublicationCard key={post.id} post={post} />)}
              <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">{isFetchingNextPage && <span>Cargando más publicaciones...</span>}</div>
            </>
          ) : <div className="p-8 text-center text-xs text-dark-muted">{activeTab === 'posts' ? 'No hay publicaciones todavía.' : activeTab === 'replies' ? 'No hay respuestas todavía.' : 'No hay publicaciones que le gusten todavía.'}</div>}
        </div>
        {isOwnProfile && isEditOpen && user && (
          <EditProfileModal key={user.id} user={user} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['profile'] }); PublicationCacheService.invalidatePublicationLists(queryClient); }} />
        )}
        <ImageViewerModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    </PullToRefresh>
  );
};
