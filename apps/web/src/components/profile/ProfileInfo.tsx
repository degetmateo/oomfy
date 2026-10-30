import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PublicUser } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ApiClient } from '../../services/api.js';

interface Props {
  user: PublicUser;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  onAvatarClick?: (url: string) => void;
}

export const ProfileInfo: React.FC<Props> = ({ user, isOwnProfile = false, onEditClick, onAvatarClick }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    setIsLoadingFollow(true);
    try {
      if (user.is_following) {
        await ApiClient.delete(`/follows/${user.username}`);
      } else {
        await ApiClient.post(`/follows/${user.username}`);
      }
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
      queryClient.invalidateQueries({ queryKey: ['suggested-members'] });
    } catch (err) {
      dialog.alert((err as Error).message, 'Error');
    } finally {
      setIsLoadingFollow(false);
    }
  };

  return (
    <div className="px-4 pb-4 border-b border-dark-border relative bg-dark-bg font-mono">
      <div className="flex justify-between items-end -mt-12 sm:-mt-16 mb-3">
        <div
          onClick={() => user.icon_url && onAvatarClick?.(user.icon_url)}
          className={`w-20 h-20 sm:w-28 sm:h-28 border-2 border-dark-border bg-dark-card overflow-hidden flex items-center justify-center font-bold text-2xl text-brand-400 ${
            user.icon_url ? 'cursor-pointer hover:opacity-90' : ''
          }`}
          title={user.icon_url ? 'Ampliar foto de perfil' : undefined}
        >
          {user.icon_url ? (
            <img src={user.icon_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </div>

        {isOwnProfile ? (
          <button
            onClick={onEditClick}
            className="px-4 py-1.5 text-xs font-bold text-dark-text hover:text-brand-400 bg-dark-card border border-dark-border hover:border-brand-500 transition-colors pixel-button"
          >
            Editar perfil
          </button>
        ) : (
          <button
            onClick={handleFollowToggle}
            onMouseEnter={() => setIsHoveringFollow(true)}
            onMouseLeave={() => setIsHoveringFollow(false)}
            disabled={isLoadingFollow}
            className={`px-4 py-1.5 text-xs font-bold transition-colors pixel-button ${
              user.is_following
                ? isHoveringFollow
                  ? 'border border-red-500 text-red-400 bg-red-950/20'
                  : 'border border-dark-border text-white bg-dark-card'
                : 'border border-brand-500 text-black bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {user.is_following
              ? isHoveringFollow
                ? 'Dejar de seguir'
                : 'Siguiendo'
              : 'Seguir'}
          </button>
        )}
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">{user.name}</h2>
          <PixelBadge role={user.role} />
        </div>
        <p className="text-xs text-dark-muted">@{user.username}</p>
      </div>

      {user.bio && <p className="mt-2 text-xs text-dark-text leading-relaxed whitespace-pre-line font-sans">{user.bio}</p>}

      <div className="flex flex-wrap gap-3 mt-3 text-xs text-dark-muted">
        {user.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {user.location}</span>
        )}
        {user.link && (
          <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-400 hover:underline">
            <LinkIcon className="w-3.5 h-3.5" /> {user.link}
          </a>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Se unió el {new Date(user.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-4 mt-3 text-xs">
        <span className="text-dark-muted">
          <strong className="text-white">{user.followed_count || 0}</strong> Siguiendo
        </span>
        <span className="text-dark-muted">
          <strong className="text-white">{user.follower_count || 0}</strong> Seguidores
        </span>
      </div>
    </div>
  );
};
