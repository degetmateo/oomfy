import React, { useState } from 'react';
import { MediaItem } from '@oomfy/shared';
import { ImageViewerModal } from '../common/ImageViewerModal.js';

interface MediaGridProps {
  images: MediaItem[];
}

export const MediaGrid: React.FC<MediaGridProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const validImages = (images || [])
    .filter((img) => img && typeof img.url === 'string' && img.url.trim().length > 0 && !failedUrls[img.url])
    .slice(0, 4);

  if (validImages.length === 0) return null;

  const count = validImages.length;
  const gridClass =
    count === 1
      ? 'grid-cols-1'
      : count === 2
      ? 'grid-cols-2'
      : count === 3
      ? 'grid-cols-2'
      : 'grid-cols-2';

  return (
    <>
      <div className={`grid gap-2 mt-3 border border-dark-border bg-dark-bg overflow-hidden max-h-96 ${gridClass}`}>
        {validImages.map((img, i) => (
          <div
            key={img.url + i}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(img.url);
            }}
            className={`relative overflow-hidden bg-dark-card cursor-pointer group ${count === 3 && i === 0 ? 'row-span-2' : ''}`}
          >
            <img
              src={img.url}
              alt="Adjunto de publicación"
              onError={() => setFailedUrls((prev) => ({ ...prev, [img.url]: true }))}
              className="w-full h-full object-cover max-h-80 group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};
