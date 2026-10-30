import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/layout/Header.js';
import { PublicationCard } from '../components/publication/PublicationCard.js';
import { ProfileInfo } from '../components/profile/ProfileInfo.js';
import { EditProfileModal } from '../components/profile/EditProfileModal.js';
import { ImageViewerModal } from '../components/common/ImageViewerModal.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { PublicUser, Publication } from '@oomfy/shared';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';

export const ProfileView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: profile } = useQuery<{ success: boolean; data: PublicUser }>({
    queryKey: ['profile', username],
    queryFn: () => ApiClient.get(`/members/${username}`),
    enabled: Boolean(username),
  });

  const {
    data: postsData,
    isLoading: loadingPosts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<{ success: boolean; data: Publication[] }>({
    queryKey: ['user-posts', username, activeTab],
    queryFn: ({ pageParam }: { pageParam: any }) => {
      const p = new URLSearchParams();
      p.append('limit', '20');
      if (pageParam) p.append('older_id', String(pageParam));

      if (activeTab === 'posts') {
        if (username) p.append('author_username', username);
        p.append('type', 'posts');
      } else if (activeTab === 'replies') {
        if (username) p.append('author_username', username);
        p.append('type', 'reply');
      } else if (activeTab === 'likes') {
        if (username) p.append('liked_by', username);
      }

      return ApiClient.get(`/publications?${p.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const posts = lastPage?.data || [];
      return posts.length >= 20 ? posts[posts.length - 1]?.id : undefined;
    },
    enabled: Boolean(username),
  });

  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, Boolean(hasNextPage));

  const user = profile?.data;
  const isOwnProfile = Boolean(
    currentUser &&
      user &&
      (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase())
  );
  const posts = postsData?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title={user?.name || `@${username}`} subtitle={`${user?.publication_count || 0} publicaciones`} />

      <div
        onClick={() => user?.banner_url && setZoomedImage(user.banner_url)}
        className={`h-32 sm:h-40 bg-[#242424] relative overflow-hidden ${
          user?.banner_url ? 'cursor-pointer hover:opacity-95' : ''
        }`}
        title={user?.banner_url ? 'Ampliar portada' : undefined}
      >
        {user?.banner_url && <img src={user.banner_url} alt="Banner" className="w-full h-full object-cover" />}
      </div>

      {user && (
        <ProfileInfo
          user={user}
          isOwnProfile={isOwnProfile}
          onEditClick={() => setIsEditOpen(true)}
          onAvatarClick={(url) => setZoomedImage(url)}
        />
      )}

      <div className="flex border-b border-dark-border text-center select-none bg-dark-bg/60">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${
            activeTab === 'posts'
              ? 'text-brand-400 border-b-2 border-brand-400'
              : 'text-dark-muted hover:text-white border-b-2 border-transparent'
          }`}
        >
          Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${
            activeTab === 'replies'
              ? 'text-brand-400 border-b-2 border-brand-400'
              : 'text-dark-muted hover:text-white border-b-2 border-transparent'
          }`}
        >
          Respuestas
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-colors ${
            activeTab === 'likes'
              ? 'text-brand-400 border-b-2 border-brand-400'
              : 'text-dark-muted hover:text-white border-b-2 border-transparent'
          }`}
        >
          Me gusta
        </button>
      </div>

      <div className="divide-y divide-dark-border">
        {loadingPosts ? (
          <div className="p-8 text-center text-xs text-dark-muted">Cargando publicaciones...</div>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PublicationCard key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
              {isFetchingNextPage && <span>Cargando más publicaciones...</span>}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-dark-muted">
            {activeTab === 'posts'
              ? 'No hay publicaciones todavía.'
              : activeTab === 'replies'
              ? 'No hay respuestas todavía.'
              : 'No hay publicaciones que le gusten todavía.'}
          </div>
        )}
      </div>

      {user && (
        <EditProfileModal
          user={user}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['profile', username] })}
        />
      )}

      <ImageViewerModal
        imageUrl={zoomedImage}
        onClose={() => setZoomedImage(null)}
      />
    </div>
  );
};
