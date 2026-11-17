import React, { useState } from 'react';
import { MediaItem } from '@oomfy/shared';
import { ImageViewerModal } from '../common/ImageViewerModal.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { ImageMemoryCache } from '../../utils/imageCache.js';

interface MediaGridProps {
  images: MediaItem[];
  priority?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ images, priority = false }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const validImages = (images || [])
    .map((img) => ({ ...img, resolvedUrl: resolveMediaUrl(img?.url) }))
    .filter((img): img is MediaItem & { resolvedUrl: string } => Boolean(img.resolvedUrl && !failedUrls[img.resolvedUrl]))
    .slice(0, 4);

  if (validImages.length === 0) return null;
  const count = validImages.length;

  const openZoom = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(url);
  };

  if (count === 1) {
    const singleImg = validImages[0];
    return (
      <>
        <div className="mt-3 flex justify-start">
          <div
            data-no-card-nav="true"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => openZoom(e, singleImg.resolvedUrl)}
            className="relative overflow-hidden bg-dark-card cursor-pointer group border border-dark-border max-w-full inline-block min-h-[120px]"
          >
            <img
              src={singleImg.resolvedUrl}
              alt="Adjunto de publicación"
              onLoad={() => ImageMemoryCache.mark(singleImg.resolvedUrl)}
              onError={() => setFailedUrls((prev) => ({ ...prev, [singleImg.resolvedUrl]: true }))}
              className="max-w-full w-auto max-h-[450px] object-contain group-hover:opacity-90 transition-opacity"
              loading={priority || ImageMemoryCache.has(singleImg.resolvedUrl) ? 'eager' : 'lazy'}
              decoding={ImageMemoryCache.has(singleImg.resolvedUrl) ? 'sync' : 'auto'}
              {...(priority ? ({ fetchpriority: 'high' } as any) : {})}
            />
          </div>
        </div>
        <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  }

  return (
    <>
      <div
        data-no-card-nav="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="grid grid-cols-2 gap-2 mt-3 border border-dark-border bg-dark-bg overflow-hidden max-h-96 aspect-[16/10]"
      >
        {validImages.map((img, i) => (
          <div
            key={img.resolvedUrl + i}
            onClick={(e) => openZoom(e, img.resolvedUrl)}
            className={`relative overflow-hidden bg-dark-card cursor-pointer group ${count === 3 && i === 0 ? 'row-span-2' : ''}`}
          >
            <img
              src={img.resolvedUrl}
              alt="Adjunto de publicación"
              onLoad={() => ImageMemoryCache.mark(img.resolvedUrl)}
              onError={() => setFailedUrls((prev) => ({ ...prev, [img.resolvedUrl]: true }))}
              className="w-full h-full object-cover max-h-80 group-hover:scale-105 transition-transform duration-200"
              loading={(priority && i === 0) || ImageMemoryCache.has(img.resolvedUrl) ? 'eager' : 'lazy'}
              decoding={ImageMemoryCache.has(img.resolvedUrl) ? 'sync' : 'auto'}
              {...(priority && i === 0 ? ({ fetchpriority: 'high' } as any) : {})}
            />
          </div>
        ))}
      </div>
      <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};
