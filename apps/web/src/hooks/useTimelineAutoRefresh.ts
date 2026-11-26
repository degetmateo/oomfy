import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

interface UseTimelineAutoRefreshOptions {
  queryKey: QueryKey;
  buildUrl: (olderId: string | null) => string;
  enabled: boolean;
  currentPosts: Publication[];
  intervalMs?: number;
}

const STICKY_HEADER_OFFSET_PX = 64;
const RESIZE_GUARD_MS = 3000;
const VISIBILITY_MIN_INTERVAL_MS = 15_000;

function pickScrollAnchor(container: HTMLElement | null): { anchorId: string; anchorTop: number } | null {
  if (!container) return null;
  const items = container.querySelectorAll<HTMLElement>('[data-feed-post-id]');
  if (items.length === 0) return null;

  let chosen: HTMLElement | null = null;
  for (const el of Array.from(items)) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > STICKY_HEADER_OFFSET_PX) {
      chosen = el;
      break;
    }
  }
  if (!chosen) chosen = items[0];
  const anchorId = chosen.getAttribute('data-feed-post-id');
  if (!anchorId) return null;
  return { anchorId, anchorTop: chosen.getBoundingClientRect().top };
}

export function useTimelineAutoRefresh({
  queryKey,
  buildUrl,
  enabled,
  currentPosts,
  intervalMs = 30_000,
}: UseTimelineAutoRefreshOptions) {
  const queryClient = useQueryClient();
  const listContainerRef = useRef<HTMLDivElement>(null);
  const pillButtonRef = useRef<HTMLButtonElement>(null);
  const currentPostsRef = useRef(currentPosts);
  currentPostsRef.current = currentPosts;

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const buildUrlRef = useRef(buildUrl);
  buildUrlRef.current = buildUrl;

  const [unseenNewCount, setUnseenNewCount] = useState(0);
  const [prependedSeq, setPrependedSeq] = useState(0);
  const pendingAnchorRef = useRef<{ anchorId: string; anchorTop: number } | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const isCheckingRef = useRef(false);
  const lastCheckedAtRef = useRef(Date.now());

  const cancelResizeGuard = useCallback(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
  }, []);

  const clearUnseen = useCallback(() => {
    setUnseenNewCount(0);
  }, []);

  const scrollToTopAndClear = useCallback(() => {
    const hadPillFocus = typeof document !== 'undefined' && document.activeElement === pillButtonRef.current;
    cancelResizeGuard();
    pendingAnchorRef.current = null;
    setUnseenNewCount(0);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (hadPillFocus) {
      listContainerRef.current?.focus({ preventScroll: true });
    }
  }, [cancelResizeGuard]);

  const checkForNewPosts = useCallback(async (): Promise<number> => {
    if (!enabled || isCheckingRef.current || currentPostsRef.current.length === 0) return 0;
    isCheckingRef.current = true;
    lastCheckedAtRef.current = Date.now();
    try {
      const fetchedAt = Date.now();
      const res = await ApiClient.get<{ success: boolean; data: Publication[] }>(buildUrlRef.current(null));
      const latest = res?.data || [];
      if (latest.length === 0) return 0;

      const registry = useEntityRegistryStore.getState();
      registry.ingestPublications(latest, fetchedAt);
      const authors = latest.flatMap((p) => [p?.author, p?.target_publication?.author]).filter(Boolean);
      if (authors.length > 0) registry.ingestUsers(authors as unknown as PublicUser[], fetchedAt);

      const existingIds = new Set(currentPostsRef.current.map((p) => p.id));
      const trulyNew: Publication[] = [];
      for (const item of latest) {
        if (!item?.id) continue;
        if (existingIds.has(item.id)) break;
        trulyNew.push(item);
      }
      if (trulyNew.length === 0) return 0;

      pendingAnchorRef.current = pickScrollAnchor(listContainerRef.current);
      queryClient.setQueryData(queryKeyRef.current, (old: any) => {
        if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
        const allExisting = new Set<string>(
          old.pages.flatMap((pg: any) => (pg?.data || []).map((p: Publication) => p.id))
        );
        const uniqueNew = trulyNew.filter((p) => !allExisting.has(p.id));
        if (uniqueNew.length === 0) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, data: [...uniqueNew, ...(firstPage.data || [])] },
            ...old.pages.slice(1),
          ],
        };
      });

      setPrependedSeq((s) => s + 1);
      setUnseenNewCount((c) => c + trulyNew.length);
      return trulyNew.length;
    } catch {
      return 0;
    } finally {
      isCheckingRef.current = false;
    }
  }, [enabled, queryClient]);

  useLayoutEffect(() => {
    const pending = pendingAnchorRef.current;
    const container = listContainerRef.current;
    if (!pending || !container) return;
    pendingAnchorRef.current = null;
    cancelResizeGuard();

    const findAnchor = () =>
      Array.from(container.querySelectorAll<HTMLElement>('[data-feed-post-id]'))
        .find((el) => el.getAttribute('data-feed-post-id') === pending.anchorId);

    const adjustAnchor = () => {
      const anchorEl = findAnchor();
      if (!anchorEl) return;
      const delta = anchorEl.getBoundingClientRect().top - pending.anchorTop;
      if (Math.abs(delta) > 0.5 && typeof window !== 'undefined' && typeof window.scrollBy === 'function') {
        window.scrollBy(0, delta);
      }
    };

    adjustAnchor();

    if (typeof ResizeObserver === 'undefined' || typeof window === 'undefined') return;
    let active = true;
    const stopGuard = () => {
      if (!active) return;
      active = false;
      observer.disconnect();
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, stopGuard));
    };
    const observer = new ResizeObserver(() => {
      if (active) adjustAnchor();
    });
    observer.observe(container);
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, stopGuard, { passive: true, once: true }));
    const timer = setTimeout(stopGuard, RESIZE_GUARD_MS);

    resizeCleanupRef.current = stopGuard;
    return stopGuard;
  }, [prependedSeq, cancelResizeGuard]);

  useEffect(() => {
    if (!enabled || unseenNewCount === 0 || typeof window === 'undefined') return;
    const onScroll = () => {
      if ((window.scrollY || 0) <= 24) {
        const hadPillFocus = typeof document !== 'undefined' && document.activeElement === pillButtonRef.current;
        setUnseenNewCount(0);
        if (hadPillFocus) listContainerRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, unseenNewCount]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void checkForNewPosts();
    }, intervalMs);

    const onVisibility = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        Date.now() - lastCheckedAtRef.current >= VISIBILITY_MIN_INTERVAL_MS
      ) {
        void checkForNewPosts();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, checkForNewPosts]);

  return {
    unseenNewCount,
    listContainerRef,
    pillButtonRef,
    scrollToTopAndClear,
    clearUnseen,
    checkForNewPosts,
  };
}
