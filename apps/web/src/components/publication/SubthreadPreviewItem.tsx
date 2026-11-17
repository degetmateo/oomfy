import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { PublicationHeader } from './PublicationHeader.js';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PublicationActions } from './PublicationActions.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

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
  const { isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();
  const cardHandlers = useCardClickGuard(() => {
    PublicationCacheService.primePublication(item);
    navigate(`/publication/${item.id}`);
  });

  return (
    <div {...cardHandlers} data-no-card-nav="true" className="px-3 sm:px-4 pt-2 pb-2.5 hover:bg-dark-card/30 transition-colors flex gap-3 cursor-pointer font-mono relative">
      <div className="w-12 flex flex-col items-center flex-shrink-0">
        {connectTop && <div className="w-0.5 h-2 bg-dark-border -mt-2 mb-1" aria-hidden="true" />}
        <div data-no-card-nav="true" onClick={(e) => { e.stopPropagation(); navigate(`/${item.author.username}`); }}>
          <PixelAvatar src={item.author.icon_url} username={item.author.username} sizeClass={avatarSizeClass} />
        </div>
        {connectBottom && <div className="w-0.5 flex-1 bg-dark-border mt-1.5 -mb-2.5" aria-hidden="true" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PublicationHeader name={item.author.name} username={item.author.username} role={item.author.role} createdAt={item.created_at} compact />
          {isRootAuthor && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500/15 text-brand-400 border border-brand-500/40 uppercase tracking-wide">
              Autor
            </span>
          )}
        </div>
        {item.content && <FormattedText text={item.content} authorId={item.author.id} className="mt-1 text-sm text-dark-text whitespace-pre-line leading-relaxed font-sans block" />}
        <MediaGrid images={item.images || []} />
        <LinkPreviewCard embeds={item.embeds} targetPublication={item.type === 'quote' ? item.target_publication : undefined} />
        <PublicationActions
          postId={item.id} initialUpvotes={Math.max(0, item.upvotes_count || 0, item.is_upvoted ? 1 : 0)} initialIsUpvoted={item.is_upvoted}
          initialShares={Math.max(0, item.shares_count || 0)} initialIsShared={item.is_shared} initialIsQuoted={item.is_quoted}
          quotesCount={Math.max(0, item.quotes_count || 0)} commentsCount={Math.max(0, item.comments_count || 0)}
          onCommentClick={() => navigate(`/publication/${item.id}`)} onQuoteClick={() => (isAuthenticated ? openPostModal(item) : navigate('/signin'))}
        />
      </div>
    </div>
  );
};
