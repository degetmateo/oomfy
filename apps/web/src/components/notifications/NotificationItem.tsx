import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, UserPlus, AtSign } from 'lucide-react';
import { AuthorSnapshot, Notification } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { PixelThumb } from '../icons/PixelThumb.js';
import { PixelShare } from '../icons/PixelShare.js';
import { formatNotificationTime, formatExactDateTime } from '../../utils/formatTime.js';
import { useUserModel } from '../../hooks/useUserModel.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { NotificationPublicationCard } from './NotificationPublicationCard.js';
import { NotificationPublicationExcerpt } from './NotificationPublicationExcerpt.js';

interface Props {
  notif: Notification;
  isUnread: boolean;
}

const renderIcon = (type: string) => {
  switch (type) {
    case 'upvote': return <PixelThumb active size={20} className="mt-0.5 flex-shrink-0" />;
    case 'share': return <PixelShare active size={20} className="mt-0.5 flex-shrink-0" />;
    case 'follow': return <UserPlus className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    case 'mention': return <AtSign className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
    default: return <Bell className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" aria-hidden="true" />;
  }
};

function getActionLabel(notif: Notification, actorsCount: number): string {
  const isGrouped = actorsCount > 1;
  const others = actorsCount - 1;
  switch (notif.type) {
    case 'upvote':
      return isGrouped
        ? `y ${others} más indicaron que les gusta tu publicación.`
        : 'indicó que le gusta tu publicación.';
    case 'share':
      return isGrouped
        ? `y ${others} más compartieron tu publicación.`
        : 'compartió tu publicación.';
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
  const isInteractionNotif = notif.type === 'upvote' || notif.type === 'share';

  const actorsCount = isInteractionNotif
    ? Math.max(1, notif.actors_count || notif.actors?.length || 1)
    : 1;
  const isGrouped = isInteractionNotif && actorsCount > 1;

  const groupedAvatars: AuthorSnapshot[] = React.useMemo(() => {
    if (!isGrouped) return [];
    const seen = new Set<string>();
    const list: AuthorSnapshot[] = [];
    for (const actor of [sender, ...(notif.actors || [])]) {
      const key = (actor?.id || actor?.username || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(actor);
      if (list.length >= 8) break;
    }
    return list;
  }, [isGrouped, sender, notif.actors]);

  const liveTargetPub = usePublicationModel(
    isInteractionNotif ? (notif.target_publication || notif.target_publication_id) : null
  );
  const targetPub = isInteractionNotif ? (liveTargetPub || notif.target_publication) : undefined;

  const destination = notif.target_publication_id
    ? `/publication/${notif.target_publication_id}`
    : notif.type === 'mention'
      ? '/chats'
      : `/${sender.username}`;

  const cardHandlers = useCardClickGuard(() => {
    if (targetPub) PublicationCacheService.primePublication(targetPub);
    navigate(destination);
  });

  if (isDirectPublication) {
    return <NotificationPublicationCard notif={notif} isUnread={isUnread} />;
  }

  return (
    <article
      {...cardHandlers}
      data-scroll-anchor={`notif-${notif.id}`}
      className={`p-4 hover:bg-dark-card/50 transition-colors flex gap-3.5 items-start cursor-pointer ${
        isUnread ? 'bg-brand-500/15 border-l-4 border-l-brand-400' : ''
      }`}
    >
      {renderIcon(notif.type)}
      {isGrouped && groupedAvatars.length > 1 ? (
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div
              data-testid="grouped-notif-avatars"
              className="flex items-center flex-wrap gap-1.5 min-w-0 max-w-full"
            >
              {groupedAvatars.map((actor) => (
                <Link
                  key={actor.id || actor.username}
                  to={`/${actor.username}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Perfil de @${actor.username}`}
                  className="flex-shrink-0 hover:opacity-85 transition-opacity"
                >
                  <PixelAvatar src={actor.icon_url || `/members/${actor.username}/icon`} username={actor.username} sizeClass="w-8 h-8" />
                </Link>
              ))}
              {actorsCount > groupedAvatars.length && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-dark-card border border-dark-border text-dark-muted flex-shrink-0">
                  +{actorsCount - groupedAvatars.length}
                </span>
              )}
            </div>
            {isUnread && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-black font-mono flex-shrink-0">NUEVO</span>}
          </div>

          <div className="min-w-0">
            <p className="text-xs text-white leading-relaxed">
              <Link to={`/${sender.username}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline mr-1.5">
                {sender.name || sender.username}
              </Link>
              <Link
                to={destination}
                onClick={(e) => {
                  e.stopPropagation();
                  if (targetPub) PublicationCacheService.primePublication(targetPub);
                }}
                className="text-dark-text font-sans hover:underline"
              >
                {getActionLabel(notif, actorsCount)}
              </Link>
            </p>
            <NotificationPublicationExcerpt
              publication={targetPub}
              isExplicitlyMissing={!targetPub && notif.target_publication === null}
              isUnread={isUnread}
            />
            <time dateTime={notif.created_at} title={formatExactDateTime(notif.created_at)} className="text-[10px] text-dark-muted mt-1 block font-mono">
              {formatNotificationTime(notif.created_at)}
            </time>
          </div>
        </div>
      ) : (
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
                <Link
                  to={destination}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (targetPub) PublicationCacheService.primePublication(targetPub);
                  }}
                  className="text-dark-text font-sans hover:underline"
                >
                  {getActionLabel(notif, actorsCount)}
                </Link>
              </p>
              {isUnread && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-black font-mono flex-shrink-0">NUEVO</span>}
            </div>
            {isInteractionNotif && (
              <NotificationPublicationExcerpt
                publication={targetPub}
                isExplicitlyMissing={!targetPub && notif.target_publication === null}
                isUnread={isUnread}
              />
            )}
            <time dateTime={notif.created_at} title={formatExactDateTime(notif.created_at)} className="text-[10px] text-dark-muted mt-1 block font-mono">
              {formatNotificationTime(notif.created_at)}
            </time>
          </div>
        </div>
      )}
    </article>
  );
};
