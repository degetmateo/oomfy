import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Heart, UserPlus, Repeat, MessageSquare, Quote } from 'lucide-react';
import { Notification } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';

interface Props {
  notif: Notification;
  isUnread: boolean;
}

const renderIcon = (type: string) => {
  switch (type) {
    case 'upvote': return <Heart className="w-5 h-5 text-red-500 fill-current mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'share': return <Repeat className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'comment': return <MessageSquare className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'quote': return <Quote className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'follow': return <UserPlus className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    default: return <Bell className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
  }
};

export const NotificationItem: React.FC<Props> = ({ notif, isUnread }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (notif.target_publication_id) navigate(`/publication/${notif.target_publication_id}`);
    else navigate(`/${notif.sender.username}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-dark-card/50 transition-colors flex gap-3.5 items-start cursor-pointer ${
        isUnread ? 'bg-brand-500/15 border-l-4 border-l-brand-400' : ''
      }`}
    >
      {renderIcon(notif.type)}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Link to={`/${notif.sender.username}`} onClick={(e) => e.stopPropagation()} aria-label={`Perfil de @${notif.sender.username}`} className="flex-shrink-0">
          <PixelAvatar src={notif.sender.icon_url || `/members/${notif.sender.username}/icon`} username={notif.sender.username} sizeClass="w-9 h-9" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white">
              <Link to={`/${notif.sender.username}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline mr-1.5">
                {notif.sender.name || notif.sender.username}
              </Link>
              <Link to={`/${notif.sender.username}`} onClick={(e) => e.stopPropagation()} className="text-dark-muted font-mono hover:underline">
                @{notif.sender.username}
              </Link>{' '}
              <span className="text-dark-text font-sans">
                {notif.type === 'upvote' && 'indicó que le gusta tu publicación.'}
                {notif.type === 'share' && 'compartió tu publicación.'}
                {notif.type === 'comment' && 'respondió a tu publicación.'}
                {notif.type === 'quote' && 'citó tu publicación.'}
                {notif.type === 'follow' && 'comenzó a seguirte.'}
              </span>
            </p>
            {isUnread && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-black font-mono flex-shrink-0">NUEVO</span>}
          </div>
          <time dateTime={notif.created_at} className="text-[10px] text-dark-muted mt-1 block font-mono">
            {new Date(notif.created_at).toLocaleDateString()}
          </time>
        </div>
      </div>
    </div>
  );
};

