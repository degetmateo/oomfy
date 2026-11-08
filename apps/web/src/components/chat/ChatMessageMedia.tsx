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
    <div className="mt-1.5 flex flex-col items-start gap-1.5 max-w-sm sm:max-w-md">
      {gifUrl && (
        <img
          src={gifUrl}
          alt="GIF"
          onClick={() => onImageClick?.(gifUrl)}
          className="self-start max-h-80 sm:max-h-96 max-w-full w-auto h-auto cursor-pointer object-contain object-left rounded border border-dark-border hover:opacity-95 block"
          loading="lazy"
        />
      )}

      {images.length > 0 && (
        <div className={`flex flex-wrap items-start gap-1.5 w-full`}>
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Adjunto"
              onClick={() => onImageClick?.(url)}
              className="self-start max-h-80 sm:max-h-96 max-w-full w-auto h-auto object-contain object-left rounded border border-dark-border cursor-pointer hover:opacity-95 block"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
};
