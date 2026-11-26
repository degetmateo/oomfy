import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { FormattedText } from '../common/FormattedText.js';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';
import { PublicationActions } from './PublicationActions.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

interface Props {
  post: Publication;
  variant?: 'feed' | 'thread' | 'detail';
  priority?: boolean;
  quoteTarget?: Publication | null;
  commentsCountOverride?: number;
  extraBeforeActions?: React.ReactNode;
  onQuoteClick?: () => void;
}

export const PublicationContentBlocks: React.FC<Props> = ({
  post,
  variant = 'feed',
  priority = false,
  quoteTarget,
  commentsCountOverride,
  extraBeforeActions,
  onQuoteClick,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openPostModal } = useUIStore();

  const textClass =
    variant === 'detail'
      ? 'text-[1.0625rem] sm:text-lg text-dark-text whitespace-pre-line leading-[1.5] font-sans block break-words'
      : 'text-base sm:text-[0.9375rem] text-dark-text whitespace-pre-line leading-[1.5] font-sans block break-words';

  const resolvedQuoteTarget =
    quoteTarget !== undefined
      ? quoteTarget
      : (post.type === 'quote' ? post.target_publication : undefined);

  const resolvedComments =
    commentsCountOverride !== undefined
      ? commentsCountOverride
      : Math.max(0, post.comments_count || 0);

  const handleQuote = onQuoteClick || (() => (isAuthenticated ? openPostModal(post) : navigate('/signin')));

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {post.content && <FormattedText text={post.content} authorId={post.author.id} className={textClass} enlargeEmoteOnly />}
      <MediaGrid images={post.images || []} priority={priority} />
      <LinkPreviewCard embeds={post.embeds} targetPublication={resolvedQuoteTarget || undefined} />
      {extraBeforeActions}
      <div className="pt-0.5" data-no-card-nav="true" onClick={(e) => e.stopPropagation()}>
        <PublicationActions
          postId={post.id}
          initialUpvotes={Math.max(0, post.upvotes_count || 0, post.is_upvoted ? 1 : 0)}
          initialIsUpvoted={Boolean(post.is_upvoted)}
          initialShares={Math.max(0, post.shares_count || 0)}
          initialIsShared={Boolean(post.is_shared)}
          initialIsQuoted={Boolean(post.is_quoted)}
          initialIsBookmarked={Boolean(post.is_bookmarked)}
          quotesCount={Math.max(0, post.quotes_count || 0)}
          commentsCount={resolvedComments}
          authorUsername={post.author?.username}
          contentPreview={post.content}
          onCommentClick={() => navigate(`/publication/${post.id}`)}
          onQuoteClick={handleQuote}
        />
      </div>
    </div>
  );
};
