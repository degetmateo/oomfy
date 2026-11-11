import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteScrollStore } from '../stores/routeScrollStore.js';

function safeScrollTo(y: number): void {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    try {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, y);
    }
  }
}

export function useRouteScroll(): void {
  const { pathname, search } = useLocation();
  const viewKey = `${pathname}${search}`;
  const activeKeyRef = useRef(viewKey);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (!isRestoringRef.current) {
        RouteScrollStore.set(activeKeyRef.current, window.scrollY || 0);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    activeKeyRef.current = viewKey;
    const targetY = RouteScrollStore.get(viewKey);

    isRestoringRef.current = true;
    safeScrollTo(targetY);

    if (targetY === 0 || Math.abs((window.scrollY || 0) - targetY) <= 2 || typeof ResizeObserver === 'undefined') {
      isRestoringRef.current = false;
      return;
    }

    let cancelled = false;
    const cancel = () => { cancelled = true; isRestoringRef.current = false; };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, cancel, { passive: true, once: true }));

    const tryRestore = () => {
      if (cancelled) return;
      safeScrollTo(targetY);
      if (Math.abs((window.scrollY || 0) - targetY) <= 2) cancel();
    };

    const rafId = requestAnimationFrame(tryRestore);
    const observer = new ResizeObserver(tryRestore);
    observer.observe(document.documentElement);
    const timer = setTimeout(cancel, 700);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, cancel));
      isRestoringRef.current = false;
    };
  }, [viewKey]);
}
