import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpotifyEmbed } from '@oomfy/shared';
import { ExternalLink, Music2, Play, X } from 'lucide-react';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { EmbedCardShell } from './EmbedCardShell.js';

interface SpotifyPlayerProps {
  embeds?: SpotifyEmbed[];
  compact?: boolean;
  isHiddenSlide?: boolean;
}

function buildDarkSpotifyIframeUrl(rawUrl?: string | null): string | null {
  if (!UrlHelper.isSafeSpotifyEmbedUrl(rawUrl)) return null;
  try {
    const u = new URL(rawUrl!.trim());
    u.searchParams.set('theme', '0');
    return u.toString();
  } catch { return null; }
}

const SpotifySingleCard: React.FC<{ embed: SpotifyEmbed; isHiddenSlide?: boolean }> = ({ embed, isHiddenSlide }) => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const darkIframeUrl = buildDarkSpotifyIframeUrl(embed.iframe_url);
  const thumb = resolveMediaUrl(embed.thumbnail_url);
  const href = `/external?url=${encodeURIComponent(embed.url)}`;

  const openExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.getSelection()?.toString() && UrlHelper.isSafeHttpUrl(embed.url)) navigate(href);
  };

  if (playing && darkIframeUrl) {
    return (
      <div data-no-card-nav="true" onClick={(e) => e.stopPropagation()} className="border border-[#1DB954]/60 bg-[#121212] overflow-hidden min-h-[8.75rem] h-full w-full flex flex-col justify-between font-mono">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-dark-border bg-dark-card/90">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#1DB954] truncate">
            <Music2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{embed.title || 'Spotify'}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a href={href} onClick={openExternal} aria-label="Abrir en Spotify" className="p-1 text-dark-muted hover:text-white">
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <button type="button" onClick={(e) => { e.stopPropagation(); setPlaying(false); }} className="px-2 py-0.5 text-[10px] font-bold border border-dark-border bg-dark-bg text-dark-text hover:text-white hover:border-[#1DB954] flex items-center gap-1">
              <X className="w-3 h-3" aria-hidden="true" /> Cerrar
            </button>
          </div>
        </div>
        <iframe
          src={darkIframeUrl}
          sandbox="allow-scripts allow-same-origin allow-popups"
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={embed.title || 'Spotify Embed'}
          className="block w-full bg-[#121212]"
        />
      </div>
    );
  }

  return (
    <EmbedCardShell
      href={href}
      onOpen={openExternal}
      badgeLabel={embed.media_kind ? `Spotify • ${embed.media_kind}` : 'Spotify'}
      badgeClass="text-[#1DB954] border-[#1DB954]/50 bg-[#1DB954]/10"
      badgeIcon={<Music2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
      title={embed.title || 'Enlace de Spotify'}
      subtitle={embed.author_name ? <span>{embed.author_name}</span> : undefined}
      description={embed.description}
      thumb={thumb}
      isHiddenSlide={isHiddenSlide}
      onPlayClick={darkIframeUrl ? (e) => { e.stopPropagation(); setPlaying(true); } : undefined}
      playAriaLabel={`Reproducir ${embed.title || 'pista de Spotify'}`}
      playBadgeClass="bg-[#1DB954] border-black/40 text-black"
      footerAction={darkIframeUrl ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
            className="px-2.5 py-1 text-[11px] font-bold border border-[#1DB954]/60 bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954] hover:text-black transition-colors inline-flex items-center gap-1 pixel-button"
          >
            <Play className="w-3 h-3 fill-current" aria-hidden="true" />
            <span>Reproducir</span>
          </button>
        </div>
      ) : undefined}
    />
  );
};

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ embeds, compact = false, isHiddenSlide = false }) => {
  const safeEmbeds = (embeds || []).filter((e) => e && (UrlHelper.isSafeHttpUrl(e.url) || UrlHelper.isSafeSpotifyEmbedUrl(e.iframe_url)));
  if (safeEmbeds.length === 0) return null;

  if (safeEmbeds.length === 1) {
    return <SpotifySingleCard embed={safeEmbeds[0]} isHiddenSlide={isHiddenSlide} />;
  }

  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'mt-2'}`}>
      {safeEmbeds.map((embed, i) => (
        <SpotifySingleCard key={`${embed.url}-${i}`} embed={embed} isHiddenSlide={isHiddenSlide} />
      ))}
    </div>
  );
};
