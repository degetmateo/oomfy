import React, { useState } from 'react';
import { MediaItem } from '@oomfy/shared';
import { ImageViewerModal } from '../common/ImageViewerModal.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { ImageMemoryCache } from '../../utils/imageCache.js';
import { MediaTileContent, ResolvedMediaItem } from './MediaTileContent.js';

interface MediaGridProps {
  images: MediaItem[];
  priority?: boolean;
  compact?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ images, priority = false, compact = false }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const validImages = (images || [])
    .map((img) => ({ ...img, resolvedUrl: resolveMediaUrl(img?.url) }))
    .filter((img): img is ResolvedMediaItem => Boolean(img.resolvedUrl && !failedUrls[img.resolvedUrl]))
    .slice(0, 4);

  if (validImages.length === 0) return null;
  const count = validImages.length;

  const openZoom = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(url);
  };

  const handleImageError = (url: string) => {
    setFailedUrls((prev) => ({ ...prev, [url]: true }));
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
    const isHiddenWarning = Boolean(singleImg.warning && !revealed[0]);
    return (
      <>
        <div
          data-no-card-nav="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`w-fit max-w-full overflow-hidden bg-dark-card border border-dark-border transition-colors ${
            isHiddenWarning ? 'min-w-[240px] min-h-[160px]' : 'hover:border-brand-500/60'
          }`}
        >
          <MediaTileContent
            img={singleImg}
            imgClassName={`block max-w-full w-auto h-auto object-contain ${compact ? 'max-h-[280px]' : 'max-h-[560px] sm:max-h-[600px]'}`}
            wrapperClassName={`relative overflow-hidden ${isHiddenWarning ? 'min-w-[240px] min-h-[160px]' : ''}`}
            loadingProps={getImgLoadingProps(singleImg.resolvedUrl, 0)}
            isRevealed={Boolean(revealed[0])}
            onReveal={() => setRevealed((prev) => ({ ...prev, 0: true }))}
            onHide={() => setRevealed((prev) => ({ ...prev, 0: false }))}
            onOpenZoom={openZoom}
            onError={handleImageError}
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
            className={`relative min-h-0 h-full overflow-hidden bg-dark-card group ${count === 3 && i === 0 ? 'row-span-2' : ''}`}
          >
            <MediaTileContent
              img={img}
              imgClassName="block w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              wrapperClassName="relative w-full h-full overflow-hidden"
              loadingProps={getImgLoadingProps(img.resolvedUrl, i)}
              isRevealed={Boolean(revealed[i])}
              onReveal={() => setRevealed((prev) => ({ ...prev, [i]: true }))}
              onHide={() => setRevealed((prev) => ({ ...prev, [i]: false }))}
              onOpenZoom={openZoom}
              onError={handleImageError}
            />
          </div>
        ))}
      </div>
      <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};
