import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Role } from '@oomfy/shared';
import { PixelBadge } from '../icons/PixelBadge.js';
import { formatRelativeTime, formatExactDateTime } from '../../utils/formatTime.js';

interface Props {
  name: string;
  username: string;
  role: Role;
  createdAt: string;
  compact?: boolean;
  rightSlot?: React.ReactNode;
}

export const PublicationHeader: React.FC<Props> = ({
  name, username, role, createdAt, compact = false, rightSlot,
}) => {
  const navigate = useNavigate();

  const goToAuthor = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/${username}`);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className={`flex items-center gap-2 flex-wrap ${compact ? 'text-xs' : ''}`}>
        <span
          onClick={goToAuthor}
          className="font-bold text-white hover:text-brand-400 truncate text-sm cursor-pointer"
        >
          {name}
        </span>
        <PixelBadge role={role} />
        <span onClick={goToAuthor} className="text-dark-muted text-xs truncate cursor-pointer hover:underline">
          @{username}
        </span>
        <span title={formatExactDateTime(createdAt)} className="text-dark-muted text-xs">
          • {formatRelativeTime(createdAt)}
        </span>
      </div>
      {rightSlot}
    </div>
  );
};

