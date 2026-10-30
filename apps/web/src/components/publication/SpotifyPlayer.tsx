import React from 'react';
import { SpotifyEmbed } from '@oomfy/shared';

interface SpotifyPlayerProps {
  embeds?: SpotifyEmbed[];
}

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ embeds }) => {
  if (!embeds || embeds.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      {embeds.map((embed, i) => (
        <div key={embed.url + i} className="rounded-xl overflow-hidden border border-dark-border">
          <iframe
            src={embed.iframe_url}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={embed.title || 'Spotify Embed'}
          />
        </div>
      ))}
    </div>
  );
};

