import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicationEmbed } from '@oomfy/shared';
import { ExternalLink, Play, Music2, Film, MessageCircle } from 'lucide-react';
import { SpotifyPlayer } from './SpotifyPlayer.js';
import { AnimeEmbedCard } from './AnimeEmbedCard.js';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

interface Props { embed: PublicationEmbed; }

function getSiteHost(url: string, fallback = 'Enlace'): string {
  try { return new URL(url).hostname; } catch { return fallback; }
}

export const PublicationEmbedItem: React.FC<Props> = ({ embed }) => {
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
    if (UrlHelper.isSafeSpotifyEmbedUrl(embed.iframe_url)) return <SpotifyPlayer embeds={[embed]} compact />;
    return (
      <a href={href} onClick={openLink} data-no-card-nav="true" className="border border-dark-border bg-dark-card/40 hover:border-[#1DB954] p-3 flex items-center gap-3 transition-colors">
        <Music2 className="w-5 h-5 text-[#1DB954] flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-[#1DB954] font-bold uppercase block">Spotify</span>
          <span className="text-xs font-bold text-white truncate block">{embed.title || embed.url}</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-dark-muted flex-shrink-0" aria-hidden="true" />
      </a>
    );
  }

  if (embed.type === 'anilist' || embed.type === 'myanimelist') {
    return <AnimeEmbedCard embed={embed} href={href} onOpen={openLink} />;
  }

  const thumb = resolveMediaUrl(embed.thumbnail_url || embed.image);
  if (embed.type === 'youtube') {
    const canPlayInline = UrlHelper.isSafeYouTubeEmbedUrl(embed.iframe_url);
    return (
      <div data-no-card-nav="true" onClick={(e) => e.stopPropagation()} className="border border-dark-border bg-dark-card/40 overflow-hidden">
        {playingYt && canPlayInline ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={embed.iframe_url}
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen loading="lazy" className="w-full h-full" title={embed.title || 'YouTube'}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (canPlayInline) setPlayingYt(true); else openLink(e); }}
            aria-label={`Reproducir ${embed.title || 'video de YouTube'}`}
            className="relative w-full aspect-video bg-dark-bg overflow-hidden block group text-left"
          >
            {thumb && <img src={thumb} alt={embed.title || 'YouTube'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />}
            <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <span className="px-3 py-2 bg-red-600/95 border border-red-400 text-white flex items-center gap-1.5 text-xs font-bold shadow-pixel">
                <Play className="w-4 h-4 fill-white" aria-hidden="true" /> YouTube
              </span>
            </span>
          </button>
        )}
        <a href={href} onClick={openLink} className="p-2.5 flex items-center justify-between gap-2 border-t border-dark-border hover:bg-dark-card/70 transition-colors">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{embed.title || 'Video de YouTube'}</h4>
            {embed.author_name && <p className="text-[11px] text-dark-muted truncate">{embed.author_name}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-dark-muted flex-shrink-0" aria-hidden="true" />
        </a>
      </div>
    );
  }

  const label = embed.type === 'twitter' ? 'Twitter / X' : embed.type === 'tiktok' ? 'TikTok' : (embed.site_name || getSiteHost(embed.url));
  const Icon = embed.type === 'twitter' ? MessageCircle : embed.type === 'tiktok' ? Film : ExternalLink;

  return (
    <a href={href} onClick={openLink} data-no-card-nav="true" className="border border-dark-border bg-dark-card/40 hover:border-brand-500 hover:bg-dark-card/70 transition-colors overflow-hidden flex flex-col sm:flex-row group text-left">
      {thumb && (
        <div className="w-full sm:w-36 h-28 flex-shrink-0 bg-dark-bg overflow-hidden relative">
          <img src={thumb} alt={embed.title || 'Vista previa'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
          {embed.type === 'tiktok' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><Play className="w-6 h-6 fill-white" aria-hidden="true" /></div>
          )}
        </div>
      )}
      <div className="p-2.5 flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-[11px] text-brand-400 truncate flex items-center gap-1 font-bold">
          <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {label}
          {embed.type === 'twitter' && embed.author_username && <span className="text-dark-muted font-normal">@{embed.author_username}</span>}
        </span>
        <h4 className="text-xs font-bold text-white truncate mt-0.5">{embed.title || embed.url}</h4>
        {embed.description && <p className="text-[11px] text-dark-muted line-clamp-2 mt-1 font-sans">{embed.description}</p>}
      </div>
    </a>
  );
};
