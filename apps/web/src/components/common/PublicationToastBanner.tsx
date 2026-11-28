import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore.js';

export const PublicationToastBanner: React.FC = () => {
  const { toast, dismissToast } = useToastStore();
  const [paused, setPaused] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    setDragY(0);
    swipedRef.current = false;
  }, [toast?.id]);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(dismissToast, 4500);
    return () => window.clearTimeout(timer);
  }, [toast?.id, paused, dismissToast]);

  if (!toast) return null;

  const isError = toast.variant === 'error';
  const beginSwipe = (y: number) => {
    startYRef.current = y;
    swipedRef.current = false;
  };
  const moveSwipe = (y: number) => {
    if (startYRef.current === null) return;
    const delta = y - startYRef.current;
    if (delta < 0) setDragY(Math.max(delta, -80));
    if (delta <= -24) {
      swipedRef.current = true;
      startYRef.current = null;
      dismissToast();
    }
  };
  const endSwipe = () => {
    startYRef.current = null;
    setDragY(0);
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onClick={() => { if (!swipedRef.current) dismissToast(); }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); endSwipe(); }}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => beginSwipe(e.touches[0].clientY)}
      onTouchMove={(e) => moveSwipe(e.touches[0].clientY)}
      onTouchEnd={endSwipe}
      onPointerDown={(e) => beginSwipe(e.clientY)}
      onPointerMove={(e) => moveSwipe(e.clientY)}
      onPointerUp={endSwipe}
      style={{ transform: `translate(-50%, ${dragY}px)` }}
      title="Clic o desliza hacia arriba para cerrar"
      className={`fixed safe-top-toast left-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-md px-3.5 py-2.5 border-2 shadow-pixel font-mono text-xs flex items-center justify-between gap-2.5 cursor-pointer select-none touch-none transition-transform duration-150 ${
        isError
          ? 'bg-[#2a1215] border-red-500 text-red-200'
          : 'bg-[#102418] border-brand-500 text-brand-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isError ? (
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" aria-hidden="true" />
        )}
        <span className="font-bold truncate">{toast.message}</span>
      </div>
      <span className="text-[10px] text-dark-muted flex items-center gap-1 flex-shrink-0">
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </span>
    </div>
  );
};
