import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PublicationEmbed } from '@oomfy/shared';
import { PublicationEmbedItem } from './PublicationEmbedItem.js';

interface Props { embeds: PublicationEmbed[]; }

export const EmbedCarousel: React.FC<Props> = ({ embeds }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const prevBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const settledIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = embeds.length;

  const commitSettle = useCallback((idx: number, userTriggered: boolean) => {
    const clamped = Math.max(0, Math.min(count - 1, idx));
    pendingTargetRef.current = null;
    setActiveIndex(clamped);
    if (userTriggered && clamped !== settledIndexRef.current) {
      settledIndexRef.current = clamped;
      setAnnouncement(`Enlace ${clamped + 1} de ${count}`);
    } else {
      settledIndexRef.current = clamped;
    }
  }, [count]);

  const measureCurrentIndex = useCallback((): number => {
    const track = trackRef.current;
    if (!track || track.clientWidth <= 0) return settledIndexRef.current;
    if (track.scrollWidth - track.scrollLeft - track.clientWidth <= 2) return count - 1;
    if (track.scrollLeft <= 2) return 0;
    return Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / track.clientWidth)));
  }, [count]);

  const goTo = useCallback((rawIdx: number) => {
    const next = Math.max(0, Math.min(count - 1, rawIdx));
    const focusedEl = typeof document !== 'undefined' ? document.activeElement : null;
    if (next === 0 && focusedEl === prevBtnRef.current) nextBtnRef.current?.focus();
    else if (next === count - 1 && focusedEl === nextBtnRef.current) prevBtnRef.current?.focus();

    pendingTargetRef.current = next;
    setActiveIndex(next);

    const track = trackRef.current;
    if (track && typeof track.scrollTo === 'function' && track.clientWidth > 0) {
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    } else {
      commitSettle(next, true);
    }
  }, [count, commitSettle]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const hasScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;
    const handleSettle = () => {
      const target = pendingTargetRef.current;
      const idx = target !== null && track.clientWidth === 0 ? target : measureCurrentIndex();
      commitSettle(idx, true);
    };
    const handleScroll = () => {
      if (pendingTargetRef.current === null && rafRef.current === null && typeof requestAnimationFrame === 'function') {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setActiveIndex(measureCurrentIndex());
        });
      }
      if (!hasScrollEnd) {
        if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
        settleTimerRef.current = setTimeout(handleSettle, 120);
      }
    };
    track.addEventListener('scroll', handleScroll, { passive: true });
    if (hasScrollEnd) track.addEventListener('scrollend', handleSettle);
    return () => {
      track.removeEventListener('scroll', handleScroll);
      if (hasScrollEnd) track.removeEventListener('scrollend', handleSettle);
      if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [measureCurrentIndex, commitSettle]);

  return (
    <section aria-roledescription="carousel" aria-label="Enlaces embebidos" data-no-swipe="true" data-no-card-nav="true" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
        <button ref={prevBtnRef} type="button" data-direction="previous" aria-label="Enlace anterior" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)} style={{ touchAction: 'manipulation' }} className="pointer-events-auto min-w-[28px] min-h-[28px] flex items-center justify-center bg-dark-bg/90 border border-dark-border text-white hover:border-brand-500 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <button ref={nextBtnRef} type="button" data-direction="next" aria-label="Siguiente enlace" disabled={activeIndex === count - 1} onClick={() => goTo(activeIndex + 1)} style={{ touchAction: 'manipulation' }} className="pointer-events-auto min-w-[28px] min-h-[28px] flex items-center justify-center bg-dark-bg/90 border border-dark-border text-white hover:border-brand-500 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div ref={trackRef} className="embed-carousel-track" tabIndex={0} role="group" aria-label="Enlaces" style={{ touchAction: 'manipulation' }}>
        {embeds.map((emb, idx) => (
          <div key={`${emb.url}-${idx}`} role="group" aria-roledescription="slide" aria-label={`${idx + 1} de ${count}`}>
            <PublicationEmbedItem embed={emb} />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <nav aria-label="Seleccionar enlace" className="mt-1.5 flex items-center justify-center gap-1">
        {embeds.map((_emb, idx) => {
          const active = idx === activeIndex;
          return (
            <button key={idx} type="button" aria-label={`Ir al enlace ${idx + 1}`} aria-current={active ? 'true' : undefined} onClick={() => goTo(idx)} className="min-w-[24px] min-h-[24px] flex items-center justify-center cursor-pointer">
              <span className={`block h-1.5 transition-all border ${active ? 'w-5 bg-brand-400 border-brand-300' : 'w-2 bg-dark-muted/60 border-dark-border'}`} />
            </button>
          );
        })}
      </nav>
    </section>
  );
};
