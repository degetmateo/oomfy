import { useEffect, useRef } from 'react';
import { useViewActive } from '../contexts/ViewActivityContext.js';

export function useInfiniteScroll(onIntersect: () => void, enabled: boolean = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isViewActive = useViewActive();

  useEffect(() => {
    if (!enabled || !isViewActive || !ref.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      { threshold: 0.05, rootMargin: '300px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect, enabled, isViewActive]);

  return ref;
}
