import { useRef } from 'react';

export function useSwipeReply(onReply?: () => void) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => onReply?.(), 500);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (Math.abs(touchStartRef.current.x - e.touches[0].clientX) > 10 || Math.abs(touchStartRef.current.y - e.touches[0].clientY) > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (!touchStartRef.current) return;
    if (touchStartRef.current.x - e.changedTouches[0].clientX > 50 && Math.abs(touchStartRef.current.y - e.changedTouches[0].clientY) < 30) {
      onReply?.();
    }
    touchStartRef.current = null;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

