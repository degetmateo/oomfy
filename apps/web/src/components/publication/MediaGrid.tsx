import React, { useState } from 'react';
import { MediaItem } from '@oomfy/shared';
import { ImageViewerModal } from '../common/ImageViewerModal.js';

interface MediaGridProps {
  images: MediaItem[];
  priority?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ images, priority = false }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const validImages = (images || [])
    .filter((img) => img && typeof img.url === 'string' && img.url.trim().length > 0 && !failedUrls[img.url])
    .slice(0, 4);

  if (validImages.length === 0) return null;

  const count = validImages.length;

  if (count === 1) {
    const singleImg = validImages[0];
    return (
      <>
        <div className="mt-3 flex justify-start">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(singleImg.url);
            }}
            className="relative overflow-hidden bg-dark-card cursor-pointer group border border-dark-border max-w-full inline-block min-h-[120px]"
          >
            <img
              src={singleImg.url}
              alt="Adjunto de publicación"
              onError={() => setFailedUrls((prev) => ({ ...prev, [singleImg.url]: true }))}
              className="max-w-full w-auto max-h-[450px] object-contain group-hover:opacity-90 transition-opacity"
              loading={priority ? 'eager' : 'lazy'}
              {...({ fetchpriority: priority ? 'high' : 'auto' } as any)}
            />
          </div>
        </div>
        <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mt-3 border border-dark-border bg-dark-bg overflow-hidden max-h-96 aspect-[16/10]">
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
              loading={priority && i === 0 ? 'eager' : 'lazy'}
              {...({ fetchpriority: priority && i === 0 ? 'high' : 'auto' } as any)}
            />
          </div>
        ))}
      </div>

      <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};
