import { useState, useRef } from 'react';

export function useSwipeReply(onReply?: () => void) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalRef = useRef<boolean | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isHorizontalRef.current = null;
    setIsDragging(true);
    setIsTriggered(false);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => { onReply?.(); reset(); }, 500);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    const dx = startRef.current.x - e.touches[0].clientX;
    const dy = startRef.current.y - e.touches[0].clientY;

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }

    if (isHorizontalRef.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontalRef.current && dx > 0) {
      const dampened = dx <= 48 ? dx : 48 + (dx - 48) * 0.25;
      const finalOffset = Math.min(68, dampened);
      setOffset(finalOffset);
      setIsTriggered(finalOffset >= 44);
    }
  };

  const reset = () => {
    setOffset(0);
    setIsDragging(false);
    setIsTriggered(false);
    startRef.current = null;
    isHorizontalRef.current = null;
  };

  const onTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (isTriggered) onReply?.();
    reset();
  };

  return { offset, isDragging, isTriggered, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset };
}
