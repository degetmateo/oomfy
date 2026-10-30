import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { PixelBadge } from '../icons/PixelBadge.js';
import { FormattedText } from '../common/FormattedText.js';
import { MediaGrid } from './MediaGrid.js';
import { LinkPreviewCard } from './LinkPreviewCard.js';

interface Props {
  post: Publication;
}

export const ThreadAncestorCard: React.FC<Props> = ({ post }) => {
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate(`/publication/${post.id}`)}
      className="p-3 sm:p-4 hover:bg-dark-card/30 transition-colors flex gap-3 cursor-pointer font-mono relative"
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/${post.author.username}`);
          }}
        >
          <PixelAvatar
            src={post.author.icon_url}
            username={post.author.username}
            sizeClass="w-9 h-9"
          />
        </div>
        <div className="w-0.5 flex-1 bg-dark-border mt-2 mb-[-12px]" />
      </div>

      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
          <span
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${post.author.username}`);
            }}
            className="font-bold text-white hover:text-brand-400 truncate"
          >
            {post.author.name}
          </span>
          <PixelBadge role={post.author.role} />
          <span className="text-dark-muted truncate">@{post.author.username}</span>
          <span className="text-dark-muted">· {new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        {post.content && (
          <FormattedText
            text={post.content}
            className="text-xs text-dark-text whitespace-pre-line leading-relaxed font-sans block mb-2"
          />
        )}

        <MediaGrid images={post.images || []} />
        <LinkPreviewCard
          embeds={post.embeds}
          targetPublication={(post.type === 'quote' || post.type === 'shared') ? post.target_publication : undefined}
        />
      </div>
    </article>
  );
};
