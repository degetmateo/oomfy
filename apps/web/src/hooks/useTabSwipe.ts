import { useRef } from 'react';

export interface UseTabSwipeOptions<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (newTab: T) => void;
  threshold?: number;
  maxPerpendicularDistance?: number;
  disabled?: boolean;
}

export function useTabSwipe<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  threshold = 45,
  maxPerpendicularDistance = 60,
  disabled = false,
}: UseTabSwipeOptions<T>) {
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) {
      startRef.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [data-no-swipe], [role="dialog"]')) {
      startRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (typeof window !== 'undefined' && (touch.clientX < 20 || touch.clientX > window.innerWidth - 20)) {
      startRef.current = null;
      return;
    }
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !startRef.current || e.changedTouches.length === 0) {
      startRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;
    const elapsed = Date.now() - startRef.current.time;
    startRef.current = null;

    if (Math.abs(deltaY) > maxPerpendicularDistance || Math.abs(deltaY) >= Math.abs(deltaX) || elapsed > 900) {
      return;
    }

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    if (deltaX < 0) {
      if (currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
      }
    } else {
      if (currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
      }
    }
  };

  return {
    touchHandlers: {
      onTouchStart,
      onTouchEnd,
    },
  };
}

