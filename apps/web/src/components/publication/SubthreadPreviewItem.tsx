import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PublicationHeader } from './PublicationHeader.js';
import { PublicationRowShell } from './PublicationRowShell.js';
import { PublicationContentBlocks } from './PublicationContentBlocks.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';

interface Props {
  item: Publication;
  connectTop?: boolean;
  connectBottom?: boolean;
  isRootAuthor?: boolean;
  avatarSizeClass?: string;
}

export const SubthreadPreviewItem: React.FC<Props> = ({
  item: rawItem, connectTop = true, connectBottom = false, isRootAuthor = false, avatarSizeClass = 'w-9 h-9',
}) => {
  const item = usePublicationModel(rawItem) || rawItem;
  const navigate = useNavigate();
  const cardHandlers = useCardClickGuard(() => {
    PublicationCacheService.primePublication(item);
    navigate(`/publication/${item.id}`);
  });

  const authorBadge = isRootAuthor ? (
    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500/15 text-brand-400 border border-brand-500/40 uppercase tracking-wide">
      Autor
    </span>
  ) : undefined;

  return (
    <PublicationRowShell
      as="div"
      post={item}
      cardHandlers={cardHandlers}
      className="px-3.5 sm:px-4 py-3 hover:bg-dark-card/30 transition-colors flex gap-3 cursor-pointer font-mono relative"
      avatarSizeClass={avatarSizeClass}
      connectTop={connectTop ? 'subthread' : false}
      connectBottom={connectBottom ? 'subthread' : false}
      noCardNavOnRoot
      header={
        <PublicationHeader
          name={item.author.name}
          username={item.author.username}
          role={item.author.role}
          createdAt={item.created_at}
          compact
          badgeSlot={authorBadge}
        />
      }
    >
      <PublicationContentBlocks post={item} variant="thread" />
    </PublicationRowShell>
  );
};
