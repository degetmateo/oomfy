import React from 'react';
import { WikipediaEmbed } from '@oomfy/shared';
import { BookOpen } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { EmbedCardShell } from './EmbedCardShell.js';

interface Props {
  embed: WikipediaEmbed;
  href: string;
  onOpen: (e: React.MouseEvent) => void;
  isHiddenSlide?: boolean;
}

export const WikipediaEmbedCard: React.FC<Props> = ({ embed, href, onOpen, isHiddenSlide = false }) => {
  const thumb = resolveMediaUrl(embed.thumbnail_url || embed.image);
  const badgeLabel = embed.language ? `Wikipedia • ${embed.language.toUpperCase()}` : 'Wikipedia';

  return (
    <EmbedCardShell
      href={href}
      onOpen={onOpen}
      badgeLabel={badgeLabel}
      badgeClass="text-zinc-200 border-zinc-500/50 bg-zinc-500/10"
      badgeIcon={<BookOpen className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
      title={embed.title || 'Artículo de Wikipedia'}
      subtitle={embed.article_description ? <span>{embed.article_description}</span> : undefined}
      description={embed.description}
      thumb={thumb}
      isHiddenSlide={isHiddenSlide}
    />
  );
};
