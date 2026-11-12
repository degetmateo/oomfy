import React from 'react';
import { Link } from 'react-router-dom';
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
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className={`flex items-center gap-2 flex-wrap ${compact ? 'text-xs' : ''}`}>
      <Link to={`/${username}`} onClick={(e) => e.stopPropagation()} className="font-bold text-white hover:text-brand-400 truncate text-sm">
        {name}
      </Link>
      <PixelBadge role={role} />
      <Link to={`/${username}`} onClick={(e) => e.stopPropagation()} className="text-dark-muted text-xs truncate hover:underline">
        @{username}
      </Link>
      <time dateTime={createdAt} title={formatExactDateTime(createdAt)} className="text-dark-muted text-xs">
        • {formatRelativeTime(createdAt)}
      </time>
    </div>
    {rightSlot}
  </div>
);

