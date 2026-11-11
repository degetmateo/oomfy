import React from 'react';
import { Link } from 'react-router-dom';
import { PublicUser } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFollowMutation } from '../../hooks/useFollowMutation.js';

interface Props {
  user: PublicUser;
}

export const UserSearchCard: React.FC<Props> = ({ user }) => {
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const { isFollowing, isLoadingFollow, toggleFollow } = useFollowMutation(user);
  const isSelf = currentUser?.id === user.id || currentUser?.username === user.username;

  return (
    <article className="p-3 sm:p-4 border-b border-dark-border hover:bg-dark-card/40 transition-colors flex items-center justify-between gap-3 font-mono">
      <Link to={`/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
        <PixelAvatar src={user.icon_url} username={user.username} sizeClass="w-12 h-12" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-white hover:text-brand-400 truncate">{user.name}</span>
            <PixelBadge role={user.role} />
            <span className="text-xs text-dark-muted truncate">@{user.username}</span>
          </div>
          {user.bio && <p className="text-xs text-dark-muted line-clamp-1 mt-0.5 font-sans">{user.bio}</p>}
        </div>
      </Link>

      {isAuthenticated && !isSelf && (
        <button
          onClick={toggleFollow}
          disabled={isLoadingFollow}
          className={`px-3 py-1 text-xs font-bold border transition-colors pixel-button flex-shrink-0 ${
            isFollowing
              ? 'border-dark-border text-white bg-dark-card hover:border-red-500 hover:text-red-400'
              : 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
          }`}
        >
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </article>
  );
};
