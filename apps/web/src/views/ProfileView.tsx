import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { PublicUser, Publication, SITE_URL } from '@oomfy/shared';
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
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const ProfileView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: profile, refetch: refetchProfile } = useQuery<{ success: boolean; data: PublicUser }>({
    queryKey: ['profile', username], queryFn: () => ApiClient.get(`/members/${username}`), enabled: Boolean(username),
  });

  const { data: postsData, isLoading: loadingPosts, isFetchingNextPage, hasNextPage, fetchNextPage, refetch: refetchPosts } =
    useInfiniteQuery<{ success: boolean; data: Publication[] }>({
      queryKey: ['user-posts', username, activeTab],
      queryFn: ({ pageParam }) => {
        const p = new URLSearchParams({ limit: '20' });
        if (pageParam) p.append('older_id', String(pageParam));
        if (activeTab === 'posts') { if (username) p.append('author_username', username); p.append('type', 'posts'); }
        else if (activeTab === 'replies') { if (username) p.append('author_username', username); p.append('type', 'reply'); }
        else if (activeTab === 'likes' && username) p.append('liked_by', username);
        return ApiClient.get(`/publications?${p.toString()}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        const list = lastPage?.data || [];
        return list.length >= 20 ? list[list.length - 1]?.id : undefined;
      },
      enabled: Boolean(username),
    });

  const loadMoreRef = useInfiniteScroll(() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }, Boolean(hasNextPage));
  const user = profile?.data;
  const isOwnProfile = Boolean(currentUser && user && (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase()));
  const posts = postsData?.pages.flatMap((page) => page.data || []) || [];
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
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-dark-muted hover:text-white border-b-2 border-transparent'}`}>
              {tab === 'posts' ? 'Publicaciones' : tab === 'replies' ? 'Respuestas' : 'Me gusta'}
            </button>
          ))}
        </div>
        <div className="divide-y divide-dark-border">
          {loadingPosts ? <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones...</div> : posts.length > 0 ? (
            <>
              {posts.map((post) => <PublicationCard key={post.id} post={post} />)}
              <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
                {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
                {hasNextPage && <a href={`/${username}?page=2`} className="sr-only">Siguiente página</a>}
              </div>
            </>
          ) : <div className="p-8 text-center text-xs text-dark-muted">{activeTab === 'posts' ? 'No hay publicaciones todavía.' : activeTab === 'replies' ? 'No hay respuestas todavía.' : 'No hay publicaciones que le gusten todavía.'}</div>}
        </div>
        {isOwnProfile && isEditOpen && user && (
          <EditProfileModal key={user.id} user={user} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['profile'] }); queryClient.invalidateQueries({ queryKey: ['user-posts'] }); queryClient.invalidateQueries({ queryKey: ['publications'] }); }} />
        )}
        <ImageViewerModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    </PullToRefresh>
  );
};
