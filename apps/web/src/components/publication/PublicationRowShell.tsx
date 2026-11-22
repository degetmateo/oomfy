import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Publication } from '@oomfy/shared';
import { PixelAvatar } from '../common/PixelAvatar.js';

interface Props {
  as?: 'article' | 'div';
  post: Publication;
  cardHandlers: React.HTMLAttributes<HTMLElement>;
  className: string;
  avatarSizeClass?: string;
  connectTop?: false | 'subthread' | 'ancestor';
  connectBottom?: false | 'card' | 'subthread' | 'ancestor';
  noCardNavOnRoot?: boolean;
  header: React.ReactNode;
  replyBanner?: React.ReactNode;
  children: React.ReactNode;
}

const TOP_LINE_CLASS = { subthread: 'w-0.5 h-2.5 bg-dark-border -mt-2 mb-1.5', ancestor: 'w-0.5 h-3 sm:h-4 bg-dark-border -mt-3 sm:-mt-4 mb-1.5' } as const;
const BOTTOM_LINE_CLASS = { card: 'w-0.5 flex-1 bg-dark-border mt-1.5 -mb-2', subthread: 'w-0.5 flex-1 bg-dark-border mt-1.5 -mb-2.5', ancestor: 'w-0.5 flex-1 bg-dark-border mt-1.5 -mb-3 sm:-mb-4' } as const;

export const PublicationRowShell: React.FC<Props> = ({
  as = 'article',
  post,
  cardHandlers,
  className,
  avatarSizeClass = 'w-12 h-12',
  connectTop = false,
  connectBottom = false,
  noCardNavOnRoot = false,
  header,
  replyBanner,
  children,
}) => {
  const navigate = useNavigate();
  const RootTag = as;

  return (
    <RootTag {...cardHandlers} {...(noCardNavOnRoot ? { 'data-no-card-nav': 'true' } : {})} className={className}>
      <div
        className="w-12 flex flex-col items-center flex-shrink-0"
        data-no-card-nav="true"
        onClick={(e) => { e.stopPropagation(); navigate(`/publication/${post.id}`); }}
      >
        {connectTop && <div className={TOP_LINE_CLASS[connectTop]} aria-hidden="true" />}
        <div onClick={(e) => { e.stopPropagation(); navigate(`/${post.author.username}`); }}>
          <PixelAvatar src={post.author.icon_url} username={post.author.username} sizeClass={avatarSizeClass} />
        </div>
        {connectBottom && <div className={BOTTOM_LINE_CLASS[connectBottom]} aria-hidden="true" />}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        {replyBanner}
        {header}
        {children}
      </div>
    </RootTag>
  );
};
