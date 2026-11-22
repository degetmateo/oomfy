import React from 'react';
import { AnimeEmbed } from '@oomfy/shared';
import { Star, Tv } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { EmbedCardShell } from './EmbedCardShell.js';

interface Props {
  embed: AnimeEmbed;
  href: string;
  onOpen: (e: React.MouseEvent) => void;
  isHiddenSlide?: boolean;
}

export const AnimeEmbedCard: React.FC<Props> = ({ embed, href, onOpen, isHiddenSlide = false }) => {
  const thumb = resolveMediaUrl(embed.thumbnail_url || embed.image);
  const isAniList = embed.type === 'anilist';
  const badgeLabel = isAniList ? 'AniList' : 'MyAnimeList';
  const badgeClass = isAniList
    ? 'text-[#3db4f2] border-[#3db4f2]/40 bg-[#3db4f2]/10'
    : 'text-[#6c8cff] border-[#2e51a2]/60 bg-[#2e51a2]/20';
  const episodeLabel = embed.episodes ? `${embed.episodes} ep.` : embed.chapters ? `${embed.chapters} cap.` : null;

  const subtitle = (
    <>
      {embed.media_format && <span>{embed.media_format}</span>}
      {embed.season_year && <span>• {embed.season_year}</span>}
      {episodeLabel && <span>• {episodeLabel}</span>}
      {typeof embed.score === 'number' && (
        <span className="inline-flex items-center gap-0.5 text-yellow-400 font-bold">
          • <Star className="w-2.5 h-2.5 fill-yellow-400" aria-hidden="true" />{embed.score}
        </span>
      )}
    </>
  );

  const footerAction = embed.genres && embed.genres.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {embed.genres.slice(0, 3).map((g) => (
        <span key={g} className="px-1.5 py-0.5 bg-dark-bg border border-dark-border text-[10px] text-dark-text">
          {g}
        </span>
      ))}
    </div>
  ) : undefined;

  return (
    <EmbedCardShell
      href={href}
      onOpen={onOpen}
      badgeLabel={badgeLabel}
      badgeClass={badgeClass}
      badgeIcon={<Tv className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
      title={embed.title || badgeLabel}
      subtitle={subtitle}
      description={embed.description}
      thumb={thumb}
      isHiddenSlide={isHiddenSlide}
      footerAction={footerAction}
    />
  );
};
