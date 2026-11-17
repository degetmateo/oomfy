import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PublicationHeader } from './PublicationHeader.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationSnapshot } from '../../hooks/usePublicationSnapshot.js';

interface Props {
  post: Publication;
  showTopLine?: boolean;
  showBottomLine?: boolean;
}

export const ThreadAncestorCard: React.FC<Props> = ({ post: rawPost, showTopLine = false, showBottomLine = true }) => {
  const post = usePublicationSnapshot(rawPost);
  const navigate = useNavigate();
  const cardHandlers = useCardClickGuard(() => navigate(`/publication/${post.id}`));

  return (
    <article {...cardHandlers} className="p-3 sm:p-4 hover:bg-dark-card/30 transition-colors flex gap-3 cursor-pointer font-mono relative">
      <div className="w-12 flex flex-col items-center flex-shrink-0">
        {showTopLine && <div className="w-0.5 h-3 sm:h-4 bg-dark-border -mt-3 sm:-mt-4 mb-1" aria-hidden="true" />}
        <div onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }} data-no-card-nav="true">
          <PixelAvatar src={post.author.icon_url} username={post.author.username} sizeClass="w-11 h-11" />
        </div>
        {showBottomLine && <div className="w-0.5 flex-1 bg-dark-border mt-1.5 -mb-3 sm:-mb-4" aria-hidden="true" />}
      </div>

      <div className="flex-1 min-w-0 pb-2">
        <div className="mb-1">
          <PublicationHeader name={post.author.name} username={post.author.username} role={post.author.role} createdAt={post.created_at} compact />
        </div>
        {post.content && <FormattedText text={post.content} authorId={post.author.id} className="text-xs text-dark-text whitespace-pre-line leading-relaxed font-sans block mb-2" />}
        <MediaGrid images={post.images || []} />
        <LinkPreviewCard embeds={post.embeds} targetPublication={(post.type === 'quote' || post.type === 'shared') ? post.target_publication : undefined} />
      </div>
    </article>
  );
};
