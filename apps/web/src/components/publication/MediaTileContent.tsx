import React, { useRef, useState } from 'react';
import { Eye, EyeOff, Pause, Play } from 'lucide-react';
import { MediaItem } from '@oomfy/shared';
import { ImageMemoryCache } from '../../utils/imageCache.js';

export type ResolvedMediaItem = MediaItem & { resolvedUrl: string };

export function isGifMedia(img: ResolvedMediaItem): boolean {
  return Boolean(img.is_gif || img.source === 'tenor' || /\.gif(?:$|[?#])/i.test(img.resolvedUrl));
}

interface MediaTileContentProps {
  img: ResolvedMediaItem;
  imgClassName: string;
  wrapperClassName?: string;
  loadingProps: {
    loading: 'eager' | 'lazy';
    decoding: 'sync' | 'auto';
    fetchpriority?: 'high';
  };
  isRevealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onOpenZoom: (e: React.MouseEvent, url: string) => void;
  onError: (url: string) => void;
}

export const MediaTileContent: React.FC<MediaTileContentProps> = ({
  img,
  imgClassName,
  wrapperClassName = 'relative',
  loadingProps,
  isRevealed,
  onReveal,
  onHide,
  onOpenZoom,
  onError,
}) => {
  const isGif = isGifMedia(img);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFrozenFrame, setHasFrozenFrame] = useState(false);
  const [resumeKey, setResumeKey] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const hasWarning = Boolean(img.warning);
  const isObscured = hasWarning && !isRevealed;
  const warningText = img.warning === 'spoiler' ? 'Spoiler' : 'Contenido sensible';

  const handleTogglePause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isPaused) {
      let captured = false;
      const imgEl = imgRef.current;
      const canvas = canvasRef.current;
      if (imgEl && canvas) {
        try {
          const width = imgEl.naturalWidth || imgEl.width || 0;
          const height = imgEl.naturalHeight || imgEl.height || 0;
          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgEl, 0, 0, width, height);
              captured = true;
            }
          }
        } catch {
          captured = false;
        }
      }
      setHasFrozenFrame(captured);
      setIsPaused(true);
      return;
    }

    setHasFrozenFrame(false);
    setIsPaused(false);
    setResumeKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-0 h-full w-full">
      <div
        onClick={(e) => {
          if (isObscured) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onOpenZoom(e, img.resolvedUrl);
        }}
        className={`${wrapperClassName} ${isObscured ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {isGif && (
          <canvas
            ref={canvasRef}
            aria-label="Fotograma pausado de GIF"
            className={isPaused && hasFrozenFrame ? imgClassName : 'hidden'}
          />
        )}

        {isGif && isPaused ? (
          !hasFrozenFrame ? (
            <div
              role="img"
              aria-label="GIF en pausa"
              className="w-full min-h-[140px] h-full bg-dark-card flex items-center justify-center p-4 text-xs font-mono text-dark-muted"
            >
              GIF pausado
            </div>
          ) : null
        ) : (
          <img
            key={`${img.resolvedUrl}-${resumeKey}`}
            ref={imgRef}
            src={img.resolvedUrl}
            alt="Adjunto de publicación"
            onLoad={() => ImageMemoryCache.mark(img.resolvedUrl)}
            onError={() => onError(img.resolvedUrl)}
            style={{ imageRendering: 'auto' }}
            className={`${imgClassName} ${
              isObscured ? 'blur-2xl scale-110 brightness-50 pointer-events-none select-none' : ''
            }`}
            {...loadingProps}
          />
        )}

        {isObscured && (
          <div
            data-no-card-nav="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-3 text-center font-mono"
          >
            <EyeOff className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">{warningText}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReveal();
              }}
              className="px-3 py-1 bg-dark-bg/95 border border-amber-400/70 text-white hover:border-brand-400 hover:text-brand-400 text-xs font-bold flex items-center gap-1.5 pixel-button cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mostrar</span>
            </button>
          </div>
        )}

        {hasWarning && isRevealed && (
          <button
            type="button"
            data-no-card-nav="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHide();
            }}
            aria-label="Ocultar imagen censurada"
            className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 bg-black/85 border border-dark-border text-[10px] font-mono text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <EyeOff className="w-3 h-3" aria-hidden="true" />
            <span>Ocultar</span>
          </button>
        )}
      </div>

      {isGif && !isObscured && (
        <div
          data-no-card-nav="true"
          onClick={(e) => e.stopPropagation()}
          className="border-t border-dark-border bg-dark-bg px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] font-mono flex-shrink-0"
        >
          <span className="text-dark-muted font-bold tracking-wider">GIF</span>
          <button
            type="button"
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Reanudar GIF' : 'Pausar GIF'}
            onClick={handleTogglePause}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-dark-border hover:border-brand-500 text-white hover:text-brand-400 transition-colors cursor-pointer"
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3" aria-hidden="true" />
                <span>Reanudar</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" aria-hidden="true" />
                <span>Pausar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
