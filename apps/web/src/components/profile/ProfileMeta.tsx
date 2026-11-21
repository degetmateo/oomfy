import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { PublicUser } from '@oomfy/shared';

import { useAuthStore } from '../../stores/authStore.js';
import { UrlHelper } from '../../utils/UrlHelper.js';

interface Props {
  user: PublicUser;
}

export const ProfileMeta: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const normalizedLink = UrlHelper.normalizeProfileLink(user.link);
  const isInternalLink = normalizedLink ? UrlHelper.isInternalUrl(normalizedLink) : false;
  const linkTarget = normalizedLink
    ? isInternalLink
      ? UrlHelper.getInternalPath(normalizedLink)
      : `/external?url=${encodeURIComponent(normalizedLink)}`
    : null;

  return (
    <>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-dark-muted">
        {user.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {user.location}
          </span>
        )}
        {linkTarget && normalizedLink && (
          <Link
            to={linkTarget}
            title={normalizedLink}
            className="flex items-center gap-1 text-brand-400 hover:underline max-w-xs truncate"
          >
            <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{user.link}</span>
          </Link>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Se unió el {new Date(user.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-4 mt-3 text-xs">
        {isAuthenticated ? (
          <>
            <button
              type="button"
              onClick={() => navigate(`/${user.username}/following`)}
              className="text-dark-muted hover:underline hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <strong className="text-white">{Math.max(0, user.followed_count || 0)}</strong> Siguiendo
            </button>
            <button
              type="button"
              onClick={() => navigate(`/${user.username}/followers`)}
              className="text-dark-muted hover:underline hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <strong className="text-white">{Math.max(0, user.follower_count || 0)}</strong> Seguidores
            </button>
          </>
        ) : (
          <>
            <span className="text-dark-muted flex items-center gap-1">
              <strong className="text-white">{Math.max(0, user.followed_count || 0)}</strong> Siguiendo
            </span>
            <span className="text-dark-muted flex items-center gap-1">
              <strong className="text-white">{Math.max(0, user.follower_count || 0)}</strong> Seguidores
            </span>
          </>
        )}
      </div>
    </>
  );
};
