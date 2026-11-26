import React, { useEffect, useState } from 'react';
import { PixelBadge } from '../icons/PixelBadge.js';
import { FormattedText } from '../common/FormattedText.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { ImageMemoryCache } from '../../utils/imageCache.js';
import { PublicUser } from '@oomfy/shared';
import { ReportModal } from '../modals/ReportModal.js';
import { ProfileMeta } from './ProfileMeta.js';
import { ProfileHeaderActions } from './ProfileHeaderActions.js';
import { ChatStartingOverlay } from '../chat/ChatStartingOverlay.js';
import { useProfileActions } from '../../hooks/useProfileActions.js';
import { useUserModel } from '../../hooks/useUserModel.js';

interface Props {
  user: PublicUser;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  onAvatarClick?: (url: string) => void;
}

export const ProfileInfo: React.FC<Props> = ({ user: rawUser, isOwnProfile = false, onEditClick, onAvatarClick }) => {
  const liveUser = useUserModel(rawUser);
  const user = liveUser || rawUser;
  const actions = useProfileActions(user);
  const [avatarError, setAvatarError] = useState(false);
  const resolvedIconUrl = resolveMediaUrl(user.icon_url);

  useEffect(() => {
    setAvatarError(false);
  }, [user.icon_url]);

  return (
    <div className="px-4 pb-4 border-b border-dark-border relative bg-dark-bg font-mono">
      <div className="flex justify-between items-end -mt-10 sm:-mt-16 mb-3">
        <div
          onClick={() => resolvedIconUrl && !avatarError && onAvatarClick?.(user.icon_url!)}
          className={`w-20 h-20 sm:w-28 sm:h-28 aspect-square flex-shrink-0 border-2 border-dark-border bg-dark-card overflow-hidden flex items-center justify-center font-bold text-2xl text-brand-400 ${
            resolvedIconUrl && !avatarError ? 'cursor-pointer hover:opacity-90' : ''
          }`}
        >
          {resolvedIconUrl && !avatarError ? (
            <img
              key={resolvedIconUrl}
              src={resolvedIconUrl}
              alt={user.username}
              width={112}
              height={112}
              loading="eager"
              fetchpriority="high"
              onLoad={() => ImageMemoryCache.mark(resolvedIconUrl)}
              onError={() => setAvatarError(true)}
              decoding={ImageMemoryCache.has(resolvedIconUrl) ? 'sync' : 'async'}
              style={{ imageRendering: 'auto' }}
              className="block w-full h-full object-cover"
            />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="mb-1 sm:mb-2 flex-shrink-0">
          <ProfileHeaderActions
            isOwnProfile={isOwnProfile}
            isAuthenticated={actions.isAuthenticated}
            isFollowing={actions.isFollowing}
            isHovering={actions.isHovering}
            isLoadingFollow={actions.isLoadingFollow}
            isStartingChat={actions.isStartingChat}
            isBlocked={actions.isBlocked}
            hasBlockedViewer={actions.hasBlockedViewer}
            isLoadingBlock={actions.isLoadingBlock}
            followsYou={actions.followsYou}
            isRemovingFollower={actions.isRemovingFollower}
            onEditClick={onEditClick}
            onReportClick={() => actions.setIsReportOpen(true)}
            onBlockToggle={actions.handleBlockToggle}
            onRemoveFollower={actions.handleRemoveFollower}
            onStartChat={actions.handleStartChat}
            onFollowToggle={actions.handleFollowToggle}
            onMouseEnter={() => actions.setIsHovering(true)}
            onMouseLeave={() => actions.setIsHovering(false)}
          />
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-white">{user.name}</h2>
          <PixelBadge role={user.role} />
          {user.follows_you && !isOwnProfile && (
            <span className="text-[10px] bg-dark-card border border-dark-border text-brand-400 px-1.5 py-0.5 rounded font-mono uppercase">
              Te sigue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <p className="text-xs text-dark-muted">@{user.username}</p>
          {user.pronouns && (
            <span
              aria-label={`Pronombres: ${user.pronouns}`}
              className="text-[11px] px-1.5 py-0.5 bg-dark-card border border-dark-border text-dark-text/90 font-mono"
            >
              {user.pronouns}
            </span>
          )}
        </div>
      </div>
      {user.bio && (
        <FormattedText text={user.bio} authorId={user.id} className="mt-2 text-xs text-dark-text leading-relaxed whitespace-pre-line font-sans block" />
      )}
      <ProfileMeta user={user} />
      <ReportModal
        isOpen={actions.isReportOpen}
        onClose={() => actions.setIsReportOpen(false)}
        targetType="user"
        targetId={user.id}
        targetUsername={user.username}
      />
      <ChatStartingOverlay isOpen={actions.isStartingChat} username={user.username} />
    </div>
  );
};
