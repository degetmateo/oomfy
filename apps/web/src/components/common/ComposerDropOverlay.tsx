import React from 'react';
import { ImagePlus } from 'lucide-react';

interface OverlayProps {
  isDragging: boolean;
  remainingSlots: number;
  maxTotal: number;
  compact?: boolean;
}

export const ComposerDropOverlay: React.FC<OverlayProps> = ({
  isDragging,
  remainingSlots,
  maxTotal,
  compact = false,
}) => {
  if (!isDragging) return null;
  const isFull = remainingSlots <= 0;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${compact ? 'inset-0.5 px-3' : 'inset-1 p-4'} z-20 flex items-center justify-center border-2 border-dashed bg-dark-bg/90 font-mono ${
        isFull ? 'border-amber-500/80 text-amber-300' : 'border-brand-500 text-brand-400'
      }`}
    >
      {compact ? (
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
          <ImagePlus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{isFull ? `Límite de ${maxTotal} archivos alcanzado` : 'Suelta imágenes o GIFs aquí'}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <ImagePlus className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs font-bold tracking-wide">Suelta imágenes o GIFs aquí</span>
          <span className="text-[11px] text-dark-muted">
            {isFull
              ? `Límite de ${maxTotal} archivos alcanzado`
              : `PNG, JPG, WEBP o GIF · ${remainingSlots} disponible${remainingSlots === 1 ? '' : 's'}`}
          </span>
        </div>
      )}
    </div>
  );
};

interface FeedbackProps {
  message: string | null;
  compact?: boolean;
}

export const ComposerDropFeedback: React.FC<FeedbackProps> = ({ message, compact = false }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`text-[11px] text-amber-300 font-mono ${
        compact ? 'px-2.5 py-1 border-b border-dark-border/40 bg-dark-card/60' : 'mt-1.5'
      }`}
    >
      {message}
    </div>
  );
};
