import React from 'react';

interface Props {
  mediaUrls?: string[];
  gifUrl?: string | null;
  onImageClick?: (url: string) => void;
}

export const ChatMessageMedia: React.FC<Props> = ({ mediaUrls, gifUrl, onImageClick }) => {
  const images = (mediaUrls || []).filter(Boolean);
  if (images.length === 0 && !gifUrl) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 max-w-sm">
      {gifUrl && (
        <img
          src={gifUrl}
          alt="GIF"
          onClick={() => onImageClick?.(gifUrl)}
          className="max-h-60 rounded border border-dark-border cursor-pointer object-cover hover:opacity-95"
          loading="lazy"
        />
      )}

      {images.length > 0 && (
        <div
          className={`grid gap-1.5 ${
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Adjunto"
              onClick={() => onImageClick?.(url)}
              className="max-h-48 w-full rounded border border-dark-border object-cover cursor-pointer hover:opacity-95"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
};

