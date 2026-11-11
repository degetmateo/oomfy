import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PublicationActions } from './PublicationActions.js';
import { PublicationMenu } from './PublicationMenu.js';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PixelShare } from '../icons/PixelShare.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { formatExactDateTime } from '../../utils/formatTime.js';
import { usePublicationSnapshot } from '../../hooks/usePublicationSnapshot.js';

interface Props {
  publication: Publication; repliesCount: number; canDelete: boolean; isAuthenticated: boolean;
  articleRef: React.RefObject<HTMLElement>; onDelete: () => void; onQuote: () => void;
}

export const PublicationDetailArticle: React.FC<Props> = ({
  publication: rawPublication, repliesCount, canDelete, articleRef, onDelete, onQuote,
}) => {
  const publication = usePublicationSnapshot(rawPublication);
  const navigate = useNavigate();

  return (
    <article ref={articleRef} className="p-4 border-b border-dark-border bg-dark-card/20 relative">
      {publication.type === 'shared' && (
        <div className="flex items-center gap-1.5 text-xs text-dark-muted mb-2 font-mono">
          <PixelShare active size={16} /><span>Compartido por @{publication.author.username}</span>
        </div>
      )}
      {publication.type === 'reply' && (
        <div className="text-xs text-dark-muted mb-2 font-mono flex items-center gap-1">
          <span>En respuesta a</span>
          <span onClick={() => {
            if (publication.target_publication?.author.username) navigate(`/${publication.target_publication.author.username}`);
            else if (publication.parent_publication_id) navigate(`/publication/${publication.parent_publication_id}`);
          }} className="text-brand-400 font-bold hover:underline cursor-pointer">
            @{publication.target_publication?.author.username || 'usuario'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div onClick={() => navigate(`/${publication.author.username}`)} className="cursor-pointer">
            <PixelAvatar src={publication.author.icon_url} username={publication.author.username} sizeClass="w-14 h-14" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span onClick={() => navigate(`/${publication.author.username}`)} className="font-bold text-white hover:text-brand-400 cursor-pointer">
                {publication.author.name}
              </span>
              <PixelBadge role={publication.author.role} />
            </div>
            <span onClick={() => navigate(`/${publication.author.username}`)} className="text-dark-muted text-xs cursor-pointer hover:underline">
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

      {publication.content && (
        <FormattedText text={publication.content} className="text-base text-dark-text whitespace-pre-line leading-relaxed mb-3 font-sans block" />
      )}

      <MediaGrid images={publication.images || []} priority />
      <LinkPreviewCard embeds={publication.embeds} targetPublication={publication.type === 'quote' ? publication.target_publication : undefined} />

      <div className="py-2 border-y border-dark-border/60 text-xs text-dark-muted my-3">
        {formatExactDateTime(publication.created_at)}
      </div>

      <PublicationActions
        postId={publication.id}
        initialUpvotes={publication.upvotes_count || 0}
        initialIsUpvoted={publication.is_upvoted}
        initialShares={publication.shares_count || 0}
        initialIsShared={publication.is_shared}
        initialIsQuoted={publication.is_quoted}
        quotesCount={publication.quotes_count || 0}
        commentsCount={publication.comments_count || repliesCount}
        onQuoteClick={onQuote}
      />
    </article>
  );
};
