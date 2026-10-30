import { useEffect, useRef } from 'react';

export function useInfiniteScroll(onIntersect: () => void, enabled: boolean = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
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
  }, [onIntersect, enabled]);

  return ref;
}
