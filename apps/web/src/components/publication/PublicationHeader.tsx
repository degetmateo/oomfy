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
  badgeSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const PublicationHeader: React.FC<Props> = ({
  name, username, role, createdAt, compact = false, badgeSlot, rightSlot,
}) => (
  <header className="flex items-start justify-between gap-2 min-w-0">
    <div className={`flex items-center gap-x-2 gap-y-0.5 flex-wrap min-w-0 ${compact ? 'text-[0.8125rem]' : ''}`}>
      <Link to={`/${username}`} onClick={(e) => e.stopPropagation()} className="font-bold text-white hover:text-brand-400 truncate text-[0.9375rem] leading-snug">
        {name}
      </Link>
      <PixelBadge role={role} />
      {badgeSlot}
      <Link to={`/${username}`} onClick={(e) => e.stopPropagation()} className="text-dark-muted text-[0.8125rem] leading-snug truncate hover:underline">
        @{username}
      </Link>
      <time dateTime={createdAt} title={formatExactDateTime(createdAt)} className="text-dark-muted text-[0.8125rem] leading-snug whitespace-nowrap">
        • {formatRelativeTime(createdAt)}
      </time>
    </div>
    {rightSlot}
  </header>
);
