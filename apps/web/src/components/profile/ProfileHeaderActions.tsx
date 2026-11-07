import React from 'react';
import { Flag, MessageSquare } from 'lucide-react';

interface Props {
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isHovering: boolean;
  isLoadingFollow: boolean;
  isStartingChat: boolean;
  onEditClick?: () => void;
  onReportClick: () => void;
  onStartChat: () => void;
  onFollowToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ProfileHeaderActions: React.FC<Props> = ({
  isOwnProfile,
  isAuthenticated,
  isFollowing,
  isHovering,
  isLoadingFollow,
  isStartingChat,
  onEditClick,
  onReportClick,
  onStartChat,
  onFollowToggle,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (isOwnProfile) {
    return (
      <button
        type="button"
        onClick={onEditClick}
        className="px-3.5 sm:px-4 py-1.5 text-xs font-bold text-dark-text hover:text-brand-400 bg-dark-card border border-dark-border hover:border-brand-500 transition-colors pixel-button"
      >
        Editar perfil
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated && (
        <button
          type="button"
          onClick={onReportClick}
          className="p-2 border border-dark-border text-dark-muted hover:text-red-400 bg-dark-card pixel-button"
          title="Reportar"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      )}
      {isAuthenticated && (
        <button
          type="button"
          onClick={onStartChat}
          disabled={isStartingChat}
          className="p-2 border border-brand-500/60 text-brand-400 hover:bg-brand-500/10 bg-dark-card pixel-button flex items-center gap-1 text-xs"
          title="Enviar mensaje"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mensaje</span>
        </button>
      )}
      <button
        type="button"
        onClick={onFollowToggle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        disabled={isLoadingFollow}
        className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold transition-colors pixel-button ${
          isFollowing
            ? isHovering
              ? 'border border-red-500 text-red-400 bg-red-950/20'
              : 'border border-dark-border text-white bg-dark-card'
            : 'border border-brand-500 text-black bg-brand-500 hover:bg-brand-600'
        }`}
      >
        {isFollowing ? (isHovering ? 'Dejar de seguir' : 'Siguiendo') : 'Seguir'}
      </button>
    </div>
  );
};
