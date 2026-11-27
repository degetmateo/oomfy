import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PublicationHeader } from './PublicationHeader.js';
import { PublicationContentBlocks } from './PublicationContentBlocks.js';
import { PixelShare } from '../icons/PixelShare.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { PublicationMenu } from './PublicationMenu.js';
import { PublicationCacheService } from '../../services/PublicationCacheService.js';
import { useCardClickGuard } from '../../hooks/useCardClickGuard.js';
import { usePublicationModel } from '../../hooks/usePublicationModel.js';

interface Props {
  post: Publication;
  canDelete: boolean;
  onDelete: () => void;
}

export const SharedPublicationCard: React.FC<Props> = ({ post: rawPost, canDelete, onDelete }) => {
  const post = usePublicationModel(rawPost) || rawPost;
  const navigate = useNavigate();
  const original = usePublicationModel(post.target_publication) || post.target_publication;
  const targetUrl = original ? `/publication/${original.id}` : post.parent_publication_id ? `/publication/${post.parent_publication_id}` : '#';

  const cardHandlers = useCardClickGuard(() => {
    if (original) PublicationCacheService.primePublication(original);
    if (targetUrl !== '#') navigate(targetUrl);
  });

  return (
    <article {...cardHandlers} data-scroll-anchor={`post-${post.id}`} className="p-3.5 sm:p-4 border-b border-dark-border hover:bg-dark-card/40 transition-colors cursor-pointer font-mono relative">
      <div className="flex items-center justify-between text-xs text-dark-muted mb-2.5 font-mono">
        <div data-no-card-nav="true" onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }} className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <PixelShare active size={16} />
          <span>Compartido por @{post.author.username}</span>
        </div>
        <PublicationMenu postId={post.id} authorId={post.author.id} authorUsername={post.author.username} content={original?.content} canDelete={canDelete} onDelete={onDelete} />
      </div>

      {original ? (
        <div className="flex gap-3">
          <div onClick={(e) => { e.stopPropagation(); navigate(`/${original.author.username}`); }} className="flex-shrink-0 cursor-pointer" data-no-card-nav="true">
            <PixelAvatar src={original.author.icon_url} username={original.author.username} sizeClass="w-12 h-12" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            <PublicationHeader name={original.author.name} username={original.author.username} role={original.author.role} createdAt={original.created_at} />
            <PublicationContentBlocks post={original} variant="feed" />
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-dark-card/50 border border-dark-border text-xs text-dark-muted">
          Publicación original no disponible o eliminada.
        </div>
      )}
    </article>
  );
};
