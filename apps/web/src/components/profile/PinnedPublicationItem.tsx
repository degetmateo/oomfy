import React from 'react';
import { Pin } from 'lucide-react';
import { Publication } from '@oomfy/shared';
import { PublicationCard } from '../publication/PublicationCard.js';

interface Props {
  post: Publication;
  pinnedByName: string;
}

export const PinnedPublicationItem: React.FC<Props> = ({ post, pinnedByName }) => {
  return (
    <div className="border-b border-dark-border bg-dark-card/10">
      <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-2.5 text-xs text-dark-muted font-mono">
        <Pin className="w-3.5 h-3.5 text-brand-400 rotate-45" />
        <span>Fijado por {pinnedByName}</span>
      </div>
      <div className="[&>article]:border-b-0">
        <PublicationCard post={post} />
      </div>
    </div>
  );
};

