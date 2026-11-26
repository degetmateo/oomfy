import React, { useState } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { ImageMemoryCache } from '../../utils/imageCache.js';

interface Props {
  src?: string | null;
  username?: string;
  sizeClass?: string;
  pixelSize?: number;
  className?: string;
  priority?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const TAILWIND_SIZE_PX: Record<string, number> = {
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
};

export function resolveAvatarPixelSize(sizeClass: string, pixelSize?: number): number {
  if (typeof pixelSize === 'number' && pixelSize > 0) return Math.round(pixelSize);
  let maxPx = 0;
  const re = /(?:^|\s)(?:[a-z]+:)*w-(\d+)(?=\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sizeClass)) !== null) {
    const px = TAILWIND_SIZE_PX[match[1]] ?? Number(match[1]) * 4;
    if (Number.isFinite(px) && px > maxPx) maxPx = px;
  }
  return maxPx > 0 ? maxPx : 48;
}

export const PixelAvatar: React.FC<Props> = ({
  src,
  username = 'OM',
  sizeClass = 'w-10 h-10',
  pixelSize,
  className = '',
  priority = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const initials = (username || 'OM').slice(0, 2).toUpperCase();
  const resolvedSrc = resolveMediaUrl(src);
  const isCached = ImageMemoryCache.has(resolvedSrc);
  const resolvedSize = resolveAvatarPixelSize(sizeClass, pixelSize);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div
      onClick={onClick}
      className={`${sizeClass} aspect-square border border-dark-border bg-dark-bg flex items-center justify-center font-bold text-xs text-brand-400 flex-shrink-0 overflow-hidden select-none ${className}`}
    >
      {!hasError && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={username}
          width={resolvedSize}
          height={resolvedSize}
          loading={priority || isCached ? 'eager' : 'lazy'}
          decoding={isCached ? 'sync' : 'async'}
          fetchpriority={priority ? 'high' : undefined}
          onLoad={() => ImageMemoryCache.mark(resolvedSrc)}
          onError={() => setHasError(true)}
          style={{ imageRendering: 'auto' }}
          className="block w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
