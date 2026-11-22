import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicationEmbed } from '@oomfy/shared';
import { MediaGrid } from './MediaGrid.js';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { formatRelativeTime, formatExactDateTime } from '../../utils/formatTime.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';
import { PublicationEmbedItem } from './PublicationEmbedItem.js';
import { EmbedCarousel } from './EmbedCarousel.js';

interface Props {
  embeds?: PublicationEmbed[];
  targetPublication?: any;
}

export const LinkPreviewCard: React.FC<Props> = ({ embeds = [], targetPublication: rawTarget }) => {
  const navigate = useNavigate();
  const targetPublication = usePublicationModel(rawTarget) || rawTarget;
  const quoteHandlers = useCardClickGuard(() => {
    if (targetPublication?.id) navigate(`/publication/${targetPublication.id}`);
  });

  const validEmbeds = (embeds || []).filter((emb) => emb && typeof emb.url === 'string' && UrlHelper.isSafeHttpUrl(emb.url));
  if (!targetPublication && validEmbeds.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 font-mono">
      {targetPublication && (
        <div
          data-no-card-nav="true"
          onMouseDown={(e) => { e.stopPropagation(); quoteHandlers.onMouseDown(e); }}
          onClick={(e) => { e.stopPropagation(); quoteHandlers.onClick(e); }}
          className="border border-dark-border p-3 sm:p-3.5 bg-dark-bg/60 hover:border-brand-500 transition-colors cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <PixelAvatar src={targetPublication.author?.icon_url} username={targetPublication.author?.username} sizeClass="w-5 h-5" />
            <span className="font-bold text-[0.8125rem] text-white truncate">{targetPublication.author?.name}</span>
            {targetPublication.author?.role && <PixelBadge role={targetPublication.author.role} />}
            <span className="text-xs text-dark-muted truncate">@{targetPublication.author?.username}</span>
            {targetPublication.created_at && (
              <span title={formatExactDateTime(targetPublication.created_at)} className="text-xs text-dark-muted">
                • {formatRelativeTime(targetPublication.created_at)}
              </span>
            )}
          </div>
          {targetPublication.content && (
            <FormattedText text={targetPublication.content} authorId={targetPublication.author?.id} className="text-[0.875rem] text-dark-text whitespace-pre-line leading-[1.5] font-sans block break-words" />
          )}
          <MediaGrid images={targetPublication.images || []} compact />
        </div>
      )}

      {validEmbeds.length === 1 && <PublicationEmbedItem embed={validEmbeds[0]} />}
      {validEmbeds.length > 1 && <EmbedCarousel embeds={validEmbeds} />}
    </div>
  );
};
