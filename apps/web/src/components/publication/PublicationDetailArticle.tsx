import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PublicationMenu } from './PublicationMenu.js';
import { PublicationReplyBanner } from './PublicationReplyBanner.js';
import { PublicationContentBlocks } from './PublicationContentBlocks.js';
import { PixelShare } from '../icons/PixelShare.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { formatExactDateTime } from '../../utils/formatTime.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';

interface Props {
  publication: Publication;
  repliesCount: number;
  canDelete: boolean;
  isAuthenticated: boolean;
  articleRef: React.RefObject<HTMLElement>;
  onDelete: () => void;
  onQuote: () => void;
}

export const PublicationDetailArticle: React.FC<Props> = ({
  publication: rawPublication, repliesCount, canDelete, articleRef, onDelete, onQuote,
}) => {
  const publication = usePublicationModel(rawPublication) || rawPublication;
  const navigate = useNavigate();

  return (
    <article ref={articleRef} className="p-4 sm:p-5 border-b border-dark-border bg-dark-card/20 relative flex flex-col gap-3.5">
      {publication.type === 'shared' && (
        <div className="flex items-center gap-1.5 text-xs text-dark-muted font-mono">
          <PixelShare active size={16} /><span>Compartido por @{publication.author.username}</span>
        </div>
      )}
      {publication.type === 'reply' && (
        <PublicationReplyBanner
          parentAuthorUsername={publication.target_publication?.author?.username}
          parentPublicationId={publication.parent_publication_id}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div onClick={() => navigate(`/${publication.author.username}`)} className="cursor-pointer flex-shrink-0">
            <PixelAvatar src={publication.author.icon_url} username={publication.author.username} sizeClass="w-14 h-14" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span onClick={() => navigate(`/${publication.author.username}`)} className="font-bold text-white hover:text-brand-400 cursor-pointer truncate">
                {publication.author.name}
              </span>
            </div>
            <span onClick={() => navigate(`/${publication.author.username}`)} className="text-dark-muted text-[0.8125rem] cursor-pointer hover:underline truncate block">
              @{publication.author.username}
            </span>
          </div>
        </div>
        <PublicationMenu
          postId={publication.id}
          authorId={publication.author.id}
          authorUsername={publication.author.username}
          content={publication.content}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      </div>

      <PublicationContentBlocks
        post={publication}
        variant="detail"
        priority
        commentsCountOverride={Math.max(0, publication.comments_count || 0, repliesCount)}
        onQuoteClick={onQuote}
        extraBeforeActions={(
          <div className="py-2.5 border-y border-dark-border/60 text-xs text-dark-muted">
            {formatExactDateTime(publication.created_at)}
          </div>
        )}
      />
    </article>
  );
};
