import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicationEmbed } from '@oomfy/shared';
import { ExternalLink, Film, MessageCircle, Play, X } from 'lucide-react';
import { SpotifyPlayer } from './SpotifyPlayer.js';
import { AnimeEmbedCard } from './AnimeEmbedCard.js';
import { WikipediaEmbedCard } from './WikipediaEmbedCard.js';
import { EmbedCardShell } from './EmbedCardShell.js';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

interface Props {
  embed: PublicationEmbed;
  isHiddenSlide?: boolean;
}

function getSiteHost(url: string, fallback = 'Enlace'): string {
  try { return new URL(url).hostname; } catch { return fallback; }
}

export const PublicationEmbedItem: React.FC<Props> = ({ embed, isHiddenSlide = false }) => {
  const navigate = useNavigate();
  const [playingYt, setPlayingYt] = useState(false);

  const href = UrlHelper.isInternalUrl(embed.url)
    ? UrlHelper.getInternalPath(embed.url)
    : `/external?url=${encodeURIComponent(embed.url)}`;

  const openLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.getSelection()?.toString() || !UrlHelper.isSafeHttpUrl(embed.url)) return;
    navigate(href);
  };

  if (embed.type === 'spotify') {
    return <SpotifyPlayer embeds={[embed]} compact isHiddenSlide={isHiddenSlide} />;
  }

  if (embed.type === 'anilist' || embed.type === 'myanimelist') {
    return <AnimeEmbedCard embed={embed} href={href} onOpen={openLink} isHiddenSlide={isHiddenSlide} />;
  }

  if (embed.type === 'wikipedia') {
    return <WikipediaEmbedCard embed={embed} href={href} onOpen={openLink} isHiddenSlide={isHiddenSlide} />;
  }

  const thumb = resolveMediaUrl(embed.thumbnail_url || embed.image);

  if (embed.type === 'youtube') {
    const canPlayInline = UrlHelper.isSafeYouTubeEmbedUrl(embed.iframe_url);
    if (playingYt && canPlayInline) {
      return (
        <div data-no-card-nav="true" onClick={(e) => e.stopPropagation()} className="border border-red-500/60 bg-black overflow-hidden min-h-[8.75rem] h-full w-full flex flex-col font-mono">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-dark-border bg-dark-card/90">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-400 truncate">
              <Play className="w-3 h-3 fill-current flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{embed.title || 'YouTube'}</span>
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setPlayingYt(false); }} className="px-2 py-0.5 text-[10px] font-bold border border-dark-border bg-dark-bg text-dark-text hover:text-white inline-flex items-center gap-1">
              <X className="w-3 h-3" aria-hidden="true" /> Cerrar
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              src={embed.iframe_url}
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen loading="lazy" className="w-full h-full" title={embed.title || 'YouTube'}
            />
          </div>
        </div>
      );
    }

    return (
      <EmbedCardShell
        href={href}
        onOpen={openLink}
        badgeLabel="YouTube"
        badgeClass="text-red-400 border-red-500/40 bg-red-500/10"
        badgeIcon={<Play className="w-3 h-3 fill-current flex-shrink-0" aria-hidden="true" />}
        title={embed.title || 'Video de YouTube'}
        subtitle={embed.author_name ? <span>{embed.author_name}</span> : undefined}
        description={embed.description}
        thumb={thumb}
        isHiddenSlide={isHiddenSlide}
        onPlayClick={canPlayInline ? (e) => { e.stopPropagation(); setPlayingYt(true); } : undefined}
        playAriaLabel={`Reproducir ${embed.title || 'video de YouTube'}`}
        playBadgeClass="bg-red-600/95 border-red-400 text-white"
      />
    );
  }

  if (embed.type === 'tiktok') {
    return (
      <EmbedCardShell
        href={href}
        onOpen={openLink}
        badgeLabel="TikTok"
        badgeClass="text-pink-400 border-pink-500/40 bg-pink-500/10"
        badgeIcon={<Film className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
        title={embed.title || (embed.author_username ? `TikTok de @${embed.author_username}` : 'Publicación de TikTok')}
        subtitle={embed.author_username ? <span>@{embed.author_username}</span> : embed.author_name ? <span>{embed.author_name}</span> : undefined}
        description={embed.description}
        thumb={thumb}
        isHiddenSlide={isHiddenSlide}
        showPlayIndicator
      />
    );
  }

  const label = embed.type === 'twitter' ? 'Twitter / X' : (embed.site_name || getSiteHost(embed.url));
  const badgeClass = embed.type === 'twitter'
    ? 'text-sky-400 border-sky-500/40 bg-sky-500/10'
    : 'text-brand-400 border-brand-500/40 bg-brand-500/10';
  const Icon = embed.type === 'twitter' ? MessageCircle : ExternalLink;

  return (
    <EmbedCardShell
      href={href}
      onOpen={openLink}
      badgeLabel={label}
      badgeClass={badgeClass}
      badgeIcon={<Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
      title={embed.title || embed.url}
      subtitle={embed.type === 'twitter' && embed.author_username ? <span>@{embed.author_username}</span> : undefined}
      description={embed.description}
      thumb={thumb}
      isHiddenSlide={isHiddenSlide}
    />
  );
};
