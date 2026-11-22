import React from 'react';
import { AnimeEmbed } from '@oomfy/shared';
import { ExternalLink, Star, Tv } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

interface Props {
  embed: AnimeEmbed;
  href: string;
  onOpen: (e: React.MouseEvent) => void;
}

export const AnimeEmbedCard: React.FC<Props> = ({ embed, href, onOpen }) => {
  const thumb = resolveMediaUrl(embed.thumbnail_url || embed.image);
  const isAniList = embed.type === 'anilist';
  const badgeText = isAniList ? 'AniList' : 'MyAnimeList';
  const badgeClass = isAniList
    ? 'text-[#3db4f2] border-[#3db4f2]/40 bg-[#3db4f2]/10'
    : 'text-[#6c8cff] border-[#2e51a2]/60 bg-[#2e51a2]/20';
  const episodeLabel = embed.episodes ? `${embed.episodes} ep.` : embed.chapters ? `${embed.chapters} cap.` : null;

  return (
    <a
      href={href}
      onClick={onOpen}
      data-no-card-nav="true"
      className="border border-dark-border bg-dark-card/50 hover:border-brand-500 hover:bg-dark-card/80 transition-colors overflow-hidden flex group text-left w-full"
    >
      {thumb && (
        <div className="w-24 sm:w-28 h-36 flex-shrink-0 bg-dark-bg overflow-hidden">
          <img src={thumb} alt={embed.title || badgeText} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        </div>
      )}
      <div className="p-2.5 flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold uppercase ${badgeClass}`}>
              <Tv className="w-3 h-3" aria-hidden="true" />
              {badgeText}
            </span>
            <ExternalLink className="w-3 h-3 text-dark-muted group-hover:text-brand-400 flex-shrink-0" aria-hidden="true" />
          </div>
          <h4 className="text-xs font-bold text-white truncate">{embed.title || badgeText}</h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-dark-muted mt-0.5">
            {embed.media_format && <span>{embed.media_format}</span>}
            {embed.season_year && <span>• {embed.season_year}</span>}
            {episodeLabel && <span>• {episodeLabel}</span>}
            {typeof embed.score === 'number' && (
              <span className="inline-flex items-center gap-0.5 text-yellow-400 font-bold">
                • <Star className="w-2.5 h-2.5 fill-yellow-400" aria-hidden="true" />{embed.score}
              </span>
            )}
          </div>
          {embed.description && (
            <p className="text-[11px] text-dark-muted line-clamp-2 mt-1 font-sans leading-snug">{embed.description}</p>
          )}
        </div>
        {embed.genres && embed.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {embed.genres.slice(0, 3).map((g) => (
              <span key={g} className="px-1.5 py-0.5 bg-dark-bg border border-dark-border text-[10px] text-dark-text">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
};
