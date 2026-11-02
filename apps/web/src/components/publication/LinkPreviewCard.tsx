import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Play } from 'lucide-react';
import { SpotifyPlayer } from './SpotifyPlayer.js';
import { MediaGrid } from './MediaGrid.js';
import { PixelBadge } from '../icons/PixelBadge.js';
import { PixelAvatar } from '../common/PixelAvatar.js';

interface Props {
  embeds?: any[];
  targetPublication?: any;
}

export const LinkPreviewCard: React.FC<Props> = ({ embeds = [], targetPublication }) => {
  const navigate = useNavigate();

  const handleExternalClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigate(`/external?url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="mt-2.5 flex flex-col gap-2 font-mono">
      {targetPublication && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/publication/${targetPublication.id}`);
          }}
          className="border border-dark-border mb-2 p-3 bg-dark-bg/60 hover:border-brand-500 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <PixelAvatar
              src={targetPublication.author?.icon_url}
              username={targetPublication.author?.username}
              sizeClass="w-5 h-5"
            />
            <span className="font-bold text-xs text-white truncate">{targetPublication.author?.name}</span>
            {targetPublication.author?.role && <PixelBadge role={targetPublication.author.role} />}
            <span className="text-[11px] text-dark-muted truncate">@{targetPublication.author?.username}</span>
          </div>

          {targetPublication.content && (
            <p className="text-xs text-dark-text whitespace-pre-line leading-relaxed font-sans">
              {targetPublication.content}
            </p>
          )}

          {targetPublication.images && targetPublication.images.length > 0 && (
            <div className="mt-2">
              <MediaGrid images={targetPublication.images} />
            </div>
          )}
        </div>
      )}

      {embeds.map((emb: any, idx: number) => {
        if (emb.type === 'spotify') {
          return <SpotifyPlayer key={idx} embeds={[emb]} />;
        }

        const thumb = emb.thumbnail_url || emb.image;

        return (
          <div
            key={idx}
            onClick={(e) => handleExternalClick(e, emb.url)}
            className="border border-dark-border bg-dark-card/40 hover:border-brand-500 hover:bg-dark-card/70 transition-colors overflow-hidden flex flex-col sm:flex-row group cursor-pointer"
          >
            {thumb && (
              <div className="w-full sm:w-36 h-28 flex-shrink-0 bg-dark-bg overflow-hidden relative">
                <img
                  src={thumb}
                  alt={emb.title || 'Vista previa'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {(emb.type === 'youtube' || emb.type === 'tiktok') && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Play className="w-6 h-6 fill-white" />
                  </div>
                )}
              </div>
            )}
            <div className="p-2.5 flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-[11px] text-brand-400 truncate flex items-center gap-1 font-bold">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {emb.site_name || (emb.url ? new URL(emb.url).hostname : 'Enlace externo')}
              </span>
              <h4 className="text-xs font-bold text-white truncate mt-0.5">{emb.title || emb.url}</h4>
              {emb.description && (
                <p className="text-[11px] text-dark-muted line-clamp-2 mt-1 font-sans">{emb.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
