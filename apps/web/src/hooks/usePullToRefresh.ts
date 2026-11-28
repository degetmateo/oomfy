import { useState, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh?: () => Promise<any> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 65,
  maxPull = 100,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const axisLockedRef = useRef<'y' | 'x' | null>(null);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!disabled) return;
    isPullingRef.current = false;
    axisLockedRef.current = null;
    pullDistanceRef.current = 0;
    setIsPulling(false);
    setPullDistance(0);
  }, [disabled]);

  useEffect(() => {
    if (disabled || !onRefreshRef.current || typeof window === 'undefined') return;

    const resetPullState = () => {
      isPullingRef.current = false;
      axisLockedRef.current = null;
      pullDistanceRef.current = 0;
      setIsPulling(false);
      setPullDistance(0);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isRefreshingRef.current) return;
      const rawTarget = e.target as (Node & { closest?: (sel: string) => Element | null }) | null;
      const targetEl =
        rawTarget && typeof rawTarget.closest === 'function'
          ? rawTarget
          : (rawTarget as Node | null)?.parentElement ?? null;
      if (targetEl?.closest?.('[role="dialog"], [role="alertdialog"], dialog[open], [data-no-pull-refresh="true"]')) return;
      if (window.scrollY <= 2) {
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
        axisLockedRef.current = null;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current || e.touches.length !== 1) return;
      if (window.scrollY > 2) {
        resetPullState();
        return;
      }

      const dx = e.touches[0].clientX - startXRef.current;
      const dy = e.touches[0].clientY - startYRef.current;

      if (axisLockedRef.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        if (Math.abs(dx) > Math.abs(dy) || dy <= 0) {
          axisLockedRef.current = 'x';
          isPullingRef.current = false;
          pullDistanceRef.current = 0;
          setIsPulling(false);
          setPullDistance(0);
          return;
        }
        axisLockedRef.current = 'y';
        setIsPulling(true);
      }

      if (axisLockedRef.current === 'y' && dy > 0) {
        const distance = Math.min(maxPull, dy * 0.5);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
        if (e.cancelable) e.preventDefault();
      } else if (dy <= 0 && pullDistanceRef.current > 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      isPullingRef.current = false;
      axisLockedRef.current = null;
      setIsPulling(false);

      const finalDistance = pullDistanceRef.current;
      if (finalDistance >= threshold && onRefreshRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        pullDistanceRef.current = threshold;
        setPullDistance(threshold);
        try {
          await onRefreshRef.current();
        } catch (err) {
          console.error(err);
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => {
      if (!isPullingRef.current && pullDistanceRef.current === 0) return;
      resetPullState();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [disabled, threshold, maxPull]);

  return { pullDistance, isRefreshing, isPulling, isReadyToRefresh: pullDistance >= threshold };
}
