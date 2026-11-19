import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Heart, UserPlus, Repeat, AtSign } from 'lucide-react';
import { Notification } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { formatNotificationTime, formatExactDateTime } from '../../utils/formatTime.js';
import { useUserModel } from '../../hooks/useUserModel.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { NotificationPublicationCard } from './NotificationPublicationCard.js';

interface Props {
  notif: Notification;
  isUnread: boolean;
}

const renderIcon = (type: string) => {
  switch (type) {
    case 'upvote': return <Heart className="w-5 h-5 text-red-500 fill-current mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'share': return <Repeat className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'follow': return <UserPlus className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'mention': return <AtSign className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    default: return <Bell className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
  }
};

function getActionLabel(notif: Notification): string {
  switch (notif.type) {
    case 'upvote': return 'indicó que le gusta tu publicación.';
    case 'share': return 'compartió tu publicación.';
    case 'follow': return 'comenzó a seguirte.';
    case 'mention': return 'te mencionó en un mensaje.';
    default: return '';
  }
}

export const NotificationItem: React.FC<Props> = ({ notif, isUnread }) => {
  const navigate = useNavigate();
  const liveSender = useUserModel(notif.sender?.username);
  const sender = {
    ...notif.sender,
    ...(liveSender ? { name: liveSender.name, username: liveSender.username, icon_url: liveSender.icon_url } : {}),
  };

  const isDirectPublication = Boolean(
    notif.target_publication_id && (notif.type === 'comment' || notif.type === 'quote' || notif.type === 'mention')
  );

  const cardHandlers = useCardClickGuard(() => {
    if (notif.target_publication_id) navigate(`/publication/${notif.target_publication_id}`);
    else if (notif.type === 'mention') navigate('/chats');
    else navigate(`/${sender.username}`);
  });

  if (isDirectPublication) {
    return <NotificationPublicationCard notif={notif} isUnread={isUnread} />;
  }

  return (
    <div
      {...cardHandlers}
      className={`p-4 hover:bg-dark-card/50 transition-colors flex gap-3.5 items-start cursor-pointer ${
        isUnread ? 'bg-brand-500/15 border-l-4 border-l-brand-400' : ''
      }`}
    >
      {renderIcon(notif.type)}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Link to={`/${sender.username}`} onClick={(e) => e.stopPropagation()} aria-label={`Perfil de @${sender.username}`} className="flex-shrink-0">
          <PixelAvatar src={sender.icon_url || `/members/${sender.username}/icon`} username={sender.username} sizeClass="w-9 h-9" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white">
              <Link to={`/${sender.username}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline mr-1.5">
                {sender.name || sender.username}
              </Link>
              <Link to={`/${sender.username}`} onClick={(e) => e.stopPropagation()} className="text-dark-muted font-mono hover:underline">
                @{sender.username}
              </Link>{' '}
              <span className="text-dark-text font-sans">{getActionLabel(notif)}</span>
            </p>
            {isUnread && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-black font-mono flex-shrink-0">NUEVO</span>}
          </div>
          <time dateTime={notif.created_at} title={formatExactDateTime(notif.created_at)} className="text-[10px] text-dark-muted mt-1 block font-mono">
            {formatNotificationTime(notif.created_at)}
          </time>
        </div>
      </div>
    </div>
  );
};
