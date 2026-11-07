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
    <div className="mt-1.5 flex flex-col gap-1.5 max-w-sm sm:max-w-md">
      {gifUrl && (
        <div className="bg-black/30 rounded border border-dark-border inline-block overflow-hidden max-w-full">
          <img
            src={gifUrl}
            alt="GIF"
            onClick={() => onImageClick?.(gifUrl)}
            className="max-h-80 sm:max-h-96 max-w-full w-auto h-auto cursor-pointer object-contain hover:opacity-95 block"
            loading="lazy"
          />
        </div>
      )}

      {images.length > 0 && (
        <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((url, i) => (
            <div key={i} className="bg-black/30 rounded border border-dark-border flex items-center justify-center overflow-hidden">
              <img
                src={url}
                alt="Adjunto"
                onClick={() => onImageClick?.(url)}
                className="max-h-72 sm:max-h-80 max-w-full w-auto h-auto object-contain cursor-pointer hover:opacity-95 block"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
