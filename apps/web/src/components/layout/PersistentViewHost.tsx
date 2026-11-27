import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { RouteErrorBoundary } from '../common/RouteErrorBoundary.js';
import { ViewActivityProvider } from '../../contexts/ViewActivityContext.js';
import { useAuthStore } from '../../stores/authStore.js';
import { RouteScrollStore, ScrollSnapshot } from '../../stores/routeScrollStore.js';
import { findVisibleScrollAnchor, pickVisibleScrollAnchor } from '../../utils/scrollAnchor.js';
import {
  MAX_DYNAMIC_CACHED_VIEWS,
  normalizeViewCacheKey,
  PINNED_VIEW_KEYS,
  shouldCacheViewRoute,
} from '../../utils/viewCachePolicy.js';

interface CachedViewEntry {
  key: string;
  element: React.ReactElement;
}

function safeScrollTo(y: number): void {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
  try {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, y);
  }
}

function safeScrollBy(delta: number): void {
  if (typeof window === 'undefined' || Math.abs(delta) <= 0.5) return;
  if (typeof window.scrollBy === 'function') {
    window.scrollBy(0, delta);
  } else {
    safeScrollTo((window.scrollY || 0) + delta);
  }
}

interface BoundaryProps {
  activeViewKey: string;
  getPaneElement: (key: string) => HTMLDivElement | null;
  onRestoreScroll: (viewKey: string, paneEl: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

class ScrollSnapshotBoundary extends React.Component<BoundaryProps> {
  getSnapshotBeforeUpdate(prevProps: BoundaryProps): null {
    if (prevProps.activeViewKey !== this.props.activeViewKey) {
      const prevPane = this.props.getPaneElement(prevProps.activeViewKey);
      const y = typeof window !== 'undefined' ? window.scrollY || 0 : 0;

      if (prevPane) {
        const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
        if (activeEl && prevPane.contains(activeEl) && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
        const anchor = pickVisibleScrollAnchor(prevPane);
        RouteScrollStore.setSnapshot(prevProps.activeViewKey, {
          y,
          ...(anchor || {}),
        });
      } else {
        RouteScrollStore.set(prevProps.activeViewKey, y);
      }
    }
    return null;
  }

  componentDidUpdate(prevProps: BoundaryProps): void {
    if (prevProps.activeViewKey !== this.props.activeViewKey) {
      const nextPane = this.props.getPaneElement(this.props.activeViewKey);
      this.props.onRestoreScroll(this.props.activeViewKey, nextPane);
    }
  }

  render(): React.ReactNode {
    return this.props.children;
  }
}

const CachedViewPane: React.FC<{
  entry: CachedViewEntry;
  isActive: boolean;
  isChats: boolean;
  setPaneRef: (key: string, el: HTMLDivElement | null) => void;
  onNavigateHome: () => void;
}> = ({ entry, isActive, isChats, setPaneRef, onNavigateHome }) => {
  const localRef = useRef<HTMLDivElement | null>(null);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      setPaneRef(entry.key, node);
    },
    [entry.key, setPaneRef]
  );

  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    (el as any).inert = !isActive;
  }, [isActive]);

  return (
    <div
      ref={handleRef}
      data-view-key={entry.key}
      aria-hidden={!isActive}
      className={isActive ? (isChats ? 'spa-view-active h-full' : 'spa-view-active') : 'spa-view-inactive'}
    >
      <ViewActivityProvider isActive={isActive} viewKey={entry.key} isPersistent>
        <RouteErrorBoundary resetKey={entry.key} onNavigateHome={onNavigateHome}>
          {entry.element}
        </RouteErrorBoundary>
      </ViewActivityProvider>
    </div>
  );
};

export const PersistentViewHost: React.FC<{ isChatsRoute: boolean }> = ({ isChatsRoute }) => {
  const outlet = useOutlet();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.user?.role ?? null);

  const authEpoch = `${isAuthenticated}:${userId ?? 'guest'}:${role ?? 'none'}`;
  const lastAuthEpochRef = useRef(authEpoch);
  const cacheRef = useRef<Map<string, CachedViewEntry>>(new Map());
  const lruOrderRef = useRef<string[]>([]);
  const paneElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  if (authEpoch !== lastAuthEpochRef.current) {
    lastAuthEpochRef.current = authEpoch;
    cacheRef.current.clear();
    lruOrderRef.current = [];
    paneElsRef.current.clear();
    RouteScrollStore.clear();
  }

  const viewKey = normalizeViewCacheKey(location.pathname);
  const activeKeyRef = useRef(viewKey);
  activeKeyRef.current = viewKey;

  const isTransitioningRef = useRef(false);
  const cleanupRestoreRef = useRef<(() => void) | null>(null);

  const canCache = Boolean(outlet) && shouldCacheViewRoute(location.pathname, isAuthenticated, role);

  if (canCache && outlet) {
    if (!cacheRef.current.has(viewKey)) {
      cacheRef.current.set(viewKey, { key: viewKey, element: outlet });
    }
    if (!PINNED_VIEW_KEYS.has(viewKey)) {
      lruOrderRef.current = [...lruOrderRef.current.filter((k) => k !== viewKey), viewKey];
      while (lruOrderRef.current.length > MAX_DYNAMIC_CACHED_VIEWS) {
        const oldestKey = lruOrderRef.current.shift()!;
        cacheRef.current.delete(oldestKey);
        paneElsRef.current.delete(oldestKey);
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!isTransitioningRef.current) {
        RouteScrollStore.set(activeKeyRef.current, window.scrollY || 0);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cleanupRestoreRef.current?.();
    };
  }, []);

  const setPaneRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) paneElsRef.current.set(key, el);
    else paneElsRef.current.delete(key);
  }, []);

  const getPaneElement = useCallback((key: string) => paneElsRef.current.get(key) ?? null, []);

  const restoreScroll = useCallback((targetKey: string, paneEl: HTMLDivElement | null) => {
    cleanupRestoreRef.current?.();
    cleanupRestoreRef.current = null;

    const snap: ScrollSnapshot | undefined = RouteScrollStore.getSnapshot(targetKey);
    isTransitioningRef.current = true;

    const finishRelease = () => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isTransitioningRef.current = false;
          });
        });
      } else {
        isTransitioningRef.current = false;
      }
    };

    if (!snap || (snap.y <= 0 && !snap.anchorId)) {
      safeScrollTo(0);
      finishRelease();
      return;
    }

    const applyAnchorOrY = () => {
      if (snap.anchorId && paneEl) {
        const anchorEl = findVisibleScrollAnchor(paneEl, snap.anchorId);
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          if (rect.height > 0) {
            const delta = rect.top - (snap.anchorTop ?? 0);
            safeScrollBy(delta);
            return true;
          }
        }
      }
      safeScrollTo(snap.y);
      return false;
    };

    safeScrollTo(snap.y);
    const anchoredImmediately = applyAnchorOrY();

    if (
      typeof ResizeObserver === 'undefined' ||
      !paneEl ||
      (anchoredImmediately && Math.abs((window.scrollY || 0) - snap.y) <= 2 && !snap.anchorId)
    ) {
      finishRelease();
      return;
    }

    let cancelled = false;
    let rafId = 0;
    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
      inputEvents.forEach((ev) => window.removeEventListener(ev, cancel));
      isTransitioningRef.current = false;
    };

    const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    inputEvents.forEach((ev) => window.addEventListener(ev, cancel, { passive: true, once: true }));

    const observer = new ResizeObserver(() => {
      if (cancelled) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!cancelled) applyAnchorOrY();
      });
    });
    observer.observe(paneEl);

    const timer = window.setTimeout(cancel, 450);
    cleanupRestoreRef.current = cancel;
  }, []);

  const navigateHome = useCallback(() => navigate('/'), [navigate]);
  const entries = Array.from(cacheRef.current.values());

  return (
    <ScrollSnapshotBoundary
      activeViewKey={viewKey}
      getPaneElement={getPaneElement}
      onRestoreScroll={restoreScroll}
    >
      {entries.map((entry) => (
        <CachedViewPane
          key={entry.key}
          entry={entry}
          isActive={canCache && entry.key === viewKey}
          isChats={isChatsRoute && entry.key === '/chats'}
          setPaneRef={setPaneRef}
          onNavigateHome={navigateHome}
        />
      ))}
      {!canCache && outlet && (
        <div data-view-key={viewKey} className="spa-view-active">
          <ViewActivityProvider isActive viewKey={viewKey} isPersistent={false}>
            <RouteErrorBoundary resetKey={viewKey} onNavigateHome={navigateHome}>
              {outlet}
            </RouteErrorBoundary>
          </ViewActivityProvider>
        </div>
      )}
    </ScrollSnapshotBoundary>
  );
};
