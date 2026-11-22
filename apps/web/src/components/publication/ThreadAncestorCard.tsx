import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PublicationHeader } from './PublicationHeader.js';
import { PublicationRowShell } from './PublicationRowShell.js';
import { PublicationContentBlocks } from './PublicationContentBlocks.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';

interface Props {
  post: Publication;
  showTopLine?: boolean;
  showBottomLine?: boolean;
}

export const ThreadAncestorCard: React.FC<Props> = ({ post: rawPost, showTopLine = false, showBottomLine = true }) => {
  const post = usePublicationModel(rawPost) || rawPost;
  const navigate = useNavigate();
  const cardHandlers = useCardClickGuard(() => navigate(`/publication/${post.id}`));

  return (
    <PublicationRowShell
      as="article"
      post={post}
      cardHandlers={cardHandlers}
      className="p-3.5 sm:p-4 hover:bg-dark-card/30 transition-colors flex gap-3 cursor-pointer font-mono relative"
      avatarSizeClass="w-11 h-11"
      connectTop={showTopLine ? 'ancestor' : false}
      connectBottom={showBottomLine ? 'ancestor' : false}
      header={
        <PublicationHeader
          name={post.author.name}
          username={post.author.username}
          role={post.author.role}
          createdAt={post.created_at}
          compact
        />
      }
    >
      <div className="pb-1">
        <PublicationContentBlocks
          post={post}
          variant="thread"
          quoteTarget={(post.type === 'quote' || post.type === 'shared') ? post.target_publication : undefined}
        />
      </div>
    </PublicationRowShell>
  );
};
