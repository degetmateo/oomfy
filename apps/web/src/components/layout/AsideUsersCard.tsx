import React from 'react';
import { Link } from 'react-router-dom';
import { PublicUser } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { useFollowMutation } from '../../hooks/useFollowMutation.js';
import { useUserModel } from '../../hooks/useUserModel.js';

const SuggestedMemberRow: React.FC<{ member: PublicUser; isAuthenticated: boolean }> = ({
  member: rawMember,
  isAuthenticated,
}) => {
  const member = useUserModel(rawMember) || rawMember;
  const { isFollowing, isLoadingFollow, toggleFollow } = useFollowMutation(member);

  return (
    <div className="flex items-center justify-between gap-2">
      <Link to={`/${member.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex-shrink-0">
          <PixelAvatar src={member.icon_url} username={member.username} sizeClass="w-10 h-10" />
        </div>
        <div className="truncate text-xs">
          <p className="font-bold text-white hover:text-brand-400 truncate">{member.name}</p>
          <p className="text-dark-muted text-[10px] truncate">@{member.username}</p>
        </div>
      </Link>
      {isAuthenticated && (
        <button
          onClick={toggleFollow}
          disabled={isLoadingFollow}
          className={`px-2.5 py-1 text-[11px] font-bold border transition-colors pixel-button flex-shrink-0 ${
            isFollowing
              ? 'border-dark-border text-white bg-dark-card hover:border-red-500 hover:text-red-400'
              : 'border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black'
          }`}
        >
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </div>
  );
};

interface Props {
  suggestedMembers: PublicUser[];
  isAuthenticated: boolean;
}

export const AsideUsersCard: React.FC<Props> = ({ suggestedMembers, isAuthenticated }) => (
  <div className="p-3 border border-dark-border bg-dark-card/50">
    <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-3">A quién seguir</h3>
    <div className="flex flex-col gap-3">
      {suggestedMembers.slice(0, 4).map((m) => (
        <SuggestedMemberRow key={m.id} member={m} isAuthenticated={isAuthenticated} />
      ))}
    </div>
  </div>
);
