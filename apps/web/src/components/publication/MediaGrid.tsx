import React, { useState } from 'react';
import { MediaItem } from '@oomfy/shared';
import { ImageViewerModal } from '../common/ImageViewerModal.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { ImageMemoryCache } from '../../utils/imageCache.js';

interface MediaGridProps {
  images: MediaItem[];
  priority?: boolean;
  compact?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ images, priority = false, compact = false }) => {
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

  const getImgLoadingProps = (url: string, idx: number) => {
    const isLcp = priority && idx === 0;
    const isCached = ImageMemoryCache.has(url);
    return {
      loading: (isLcp || isCached ? 'eager' : 'lazy') as 'eager' | 'lazy',
      decoding: (isCached ? 'sync' : 'auto') as 'sync' | 'auto',
      ...(isLcp ? { fetchpriority: 'high' as const } : {}),
    };
  };

  if (count === 1) {
    const singleImg = validImages[0];
    return (
      <>
        <div
          data-no-card-nav="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => openZoom(e, singleImg.resolvedUrl)}
          className="w-full overflow-hidden bg-dark-card border border-dark-border cursor-pointer group"
        >
          <img
            src={singleImg.resolvedUrl}
            alt="Adjunto de publicación"
            onLoad={() => ImageMemoryCache.mark(singleImg.resolvedUrl)}
            onError={() => setFailedUrls((prev) => ({ ...prev, [singleImg.resolvedUrl]: true }))}
            className={`block w-full object-cover ${compact ? 'aspect-[16/9] max-h-[240px]' : 'aspect-[16/10] max-h-[420px]'} group-hover:scale-[1.01] transition-transform duration-200`}
            {...getImgLoadingProps(singleImg.resolvedUrl, 0)}
          />
        </div>
        <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  }

  const gridRowsClass = count >= 3 ? 'grid-rows-2' : '';
  const gridHeightClass = count >= 3
    ? (compact ? 'aspect-[16/9] max-h-[240px]' : 'aspect-[16/9] max-h-[380px]')
    : (compact ? 'aspect-[16/9] max-h-[220px]' : 'aspect-[16/9] max-h-[360px]');

  return (
    <>
      <div
        data-no-card-nav="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`grid grid-cols-2 ${gridRowsClass} gap-0.5 w-full ${gridHeightClass} border border-dark-border bg-dark-bg overflow-hidden`}
      >
        {validImages.map((img, i) => (
          <div
            key={img.resolvedUrl + i}
            onClick={(e) => openZoom(e, img.resolvedUrl)}
            className={`relative min-h-0 h-full overflow-hidden bg-dark-card cursor-pointer group ${count === 3 && i === 0 ? 'row-span-2' : ''}`}
          >
            <img
              src={img.resolvedUrl}
              alt="Adjunto de publicación"
              onLoad={() => ImageMemoryCache.mark(img.resolvedUrl)}
              onError={() => setFailedUrls((prev) => ({ ...prev, [img.resolvedUrl]: true }))}
              className="block w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              {...getImgLoadingProps(img.resolvedUrl, i)}
            />
          </div>
        ))}
      </div>
      <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};
