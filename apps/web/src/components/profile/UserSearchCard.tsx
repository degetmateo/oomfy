import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicUser } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

interface Props {
  user: PublicUser;
}

export const UserSearchCard: React.FC<Props> = ({ user }) => {
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const dialog = useDialogStore();
  const [following, setFollowing] = useState(user.is_following || false);
  const isSelf = currentUser?.id === user.id || currentUser?.username === user.username;

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (following) {
        await ApiClient.delete(`/follows/${user.username}`);
        setFollowing(false);
      } else {
        await ApiClient.post(`/follows/${user.username}`);
        setFollowing(true);
        dialog.alert(`Ahora sigues a @${user.username}`, 'Comunidad');
      }
    } catch (err) {
      dialog.alert((err as Error).message, 'Error al seguir');
    }
  };

  return (
    <article className="p-3 sm:p-4 border-b border-dark-border hover:bg-dark-card/40 transition-colors flex items-center justify-between gap-3 font-mono">
      <Link to={`/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 border border-dark-border bg-dark-bg flex items-center justify-center font-bold text-sm text-brand-400 flex-shrink-0">
          {user.icon_url ? (
            <img src={user.icon_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </div>
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
          onClick={handleFollow}
          className={`px-3 py-1 text-xs font-bold border transition-colors pixel-button flex-shrink-0 ${
            following
              ? 'border-dark-border text-white bg-dark-card hover:border-red-500 hover:text-red-400'
              : 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
          }`}
        >
          {following ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </article>
  );
};
