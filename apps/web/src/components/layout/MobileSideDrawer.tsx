import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, X } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { PixelNavIcon } from '../icons/PixelNavIcon.js';
import { buildMobileDrawerNavItems } from '../../config/navigation.js';
import { RoutePrefetchService } from '../../services/RoutePrefetchService.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

export const MobileSideDrawer: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isMobileDrawerOpen, closeMobileDrawer } = useUIStore();
  const [isClosing, setIsClosing] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const isOpeningRef = useRef(false);
  const hasEnteredViewRef = useRef(false);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const prevPathnameRef = useRef(location.pathname);

  const shouldRenderContent = isMobileDrawerOpen || isClosing;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    clearCloseTimer();
    isOpeningRef.current = false;
    hasEnteredViewRef.current = false;
    isClosingRef.current = false;
    setIsClosing(false);
    const dialog = dialogRef.current;
    if (dialog && dialog.hasAttribute('open')) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)')?.matches &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.dataset.testid === 'mobile-drawer-trigger'
    ) {
      document.activeElement.blur();
    }
    if (useUIStore.getState().isMobileDrawerOpen) {
      closeMobileDrawer();
    }
  }, [clearCloseTimer, closeMobileDrawer]);

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    isOpeningRef.current = false;
    isClosingRef.current = true;

    if (!dialog || !dialog.hasAttribute('open')) {
      isClosingRef.current = false;
      setIsClosing(false);
      closeMobileDrawer();
      return;
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (scroller && scroller.offsetWidth > 0 && typeof scroller.scrollTo === 'function' && !reducedMotion) {
      setIsClosing(true);
      closeMobileDrawer();
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(finishClose, 400);
      return;
    }

    finishClose();
  }, [clearCloseTimer, closeMobileDrawer, finishClose]);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    if (!dialog) return;

    if (!isMobileDrawerOpen) {
      if (dialog.hasAttribute('open') && !isClosingRef.current) {
        requestCloseRef.current();
      }
      return;
    }

    clearCloseTimer();
    setIsClosing(false);
    isClosingRef.current = false;
    hasEnteredViewRef.current = false;
    isOpeningRef.current = true;

    if (!dialog.hasAttribute('open')) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    sheetRef.current?.focus({ preventScroll: true });

    if (!scroller) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (scroller.offsetWidth === 0 || typeof scroller.scrollTo !== 'function') {
      dialog.style.setProperty('--drawer-backdrop', '1');
      isOpeningRef.current = false;
      hasEnteredViewRef.current = true;
      return;
    }

    const supportsScrollInitialTarget =
      typeof CSS !== 'undefined' && CSS.supports?.('scroll-initial-target', 'nearest');
    const supportsScrollTimeline =
      typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');

    const syncBackdropFallback = () => {
      if (supportsScrollTimeline) return;
      const sheet = sheetRef.current;
      const maxScroll = Math.max(sheet?.offsetWidth || scroller.offsetWidth, 1);
      const progress = Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll));
      dialog.style.setProperty('--drawer-backdrop', String(1 - progress));
    };

    let raf1 = 0;
    let raf2 = 0;

    if (!supportsScrollInitialTarget) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          isOpeningRef.current = false;
          scroller.scrollTo({ left: 0, behavior: reducedMotion ? 'instant' : 'auto' });
          syncBackdropFallback();
        });
      });
    } else {
      raf1 = requestAnimationFrame(() => {
        isOpeningRef.current = false;
        scroller.scrollTo({ left: 0, behavior: reducedMotion ? 'instant' : 'auto' });
        syncBackdropFallback();
      });
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isMobileDrawerOpen, clearCloseTimer]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!shouldRenderContent || !dialog || !scroller || !sheet) return;

    const supportsScrollTimeline =
      typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');

    const handleScrollFallback = () => {
      if (supportsScrollTimeline) return;
      const maxScroll = Math.max(sheet.offsetWidth || scroller.offsetWidth, 1);
      const progress = Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll));
      dialog.style.setProperty('--drawer-backdrop', String(1 - progress));
    };

    scroller.addEventListener('scroll', handleScrollFallback, { passive: true });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      const visibleThreshold = 1 / Math.max(window.innerWidth || 1, 1);
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry || !dialog.hasAttribute('open') || isOpeningRef.current) return;
          if (entry.intersectionRatio >= 0.25) {
            hasEnteredViewRef.current = true;
          } else if (
            entry.intersectionRatio < visibleThreshold &&
            (hasEnteredViewRef.current || isClosingRef.current) &&
            scroller.offsetWidth > 0
          ) {
            finishClose();
          }
        },
        { root: dialog, threshold: [visibleThreshold, 0.25, 1] }
      );
      observer.observe(sheet);
    }

    return () => {
      scroller.removeEventListener('scroll', handleScrollFallback);
      observer?.disconnect();
      clearCloseTimer();
    };
  }, [shouldRenderContent, finishClose, clearCloseTimer]);

  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      if (isMobileDrawerOpen || dialogRef.current?.hasAttribute('open')) {
        finishClose();
      }
    }
  }, [location.pathname, isMobileDrawerOpen, finishClose]);

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 768px)');
    if (!mq?.addEventListener) return;
    const handleResize = (e: MediaQueryListEvent) => {
      if (e.matches && (isMobileDrawerOpen || isClosingRef.current)) finishClose();
    };
    mq.addEventListener('change', handleResize);
    return () => mq.removeEventListener('change', handleResize);
  }, [isMobileDrawerOpen, finishClose]);

  if (!isAuthenticated || !user) return null;

  const drawerLinks = buildMobileDrawerNavItems(user);

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      requestClose();
    }
  };

  return (
    <dialog
      id="mobile-nav-drawer"
      ref={dialogRef}
      aria-label="Menú de navegación"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={handleDialogClick}
      className="mobile-drawer md:hidden font-mono"
    >
      {shouldRenderContent && (
        <div ref={scrollerRef} className="mobile-drawer-scroller">
          <aside
            ref={sheetRef}
            tabIndex={-1}
            aria-label="Panel de usuario y opciones"
            className="mobile-drawer-sheet bg-dark-bg border-r border-dark-border text-dark-text flex flex-col justify-between shadow-2xl outline-none focus:outline-none focus-visible:outline-none"
          >
            <div>
              <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] border-b border-dark-border">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/${user.username}`}
                    onClick={requestClose}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className="flex items-center gap-3 min-w-0 group select-none outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <PixelAvatar
                      src={user.icon_url}
                      username={user.username}
                      sizeClass="w-11 h-11"
                      priority
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate [@media(hover:hover)]:group-hover:text-brand-400 transition-colors">
                        {user.name}
                      </p>
                      <p className="text-xs text-dark-muted truncate">@{user.username}</p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={requestClose}
                    aria-label="Cerrar menú"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className="p-2 -mr-1 -mt-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-dark-muted hover:text-white rounded transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs">
                  <Link to={`/${user.username}/following`} onClick={requestClose} className="hover:underline">
                    <span className="font-bold text-white">{user.followed_count ?? 0}</span>{' '}
                    <span className="text-dark-muted">Siguiendo</span>
                  </Link>
                  <Link to={`/${user.username}/followers`} onClick={requestClose} className="hover:underline">
                    <span className="font-bold text-white">{user.follower_count ?? 0}</span>{' '}
                    <span className="text-dark-muted">Seguidores</span>
                  </Link>
                </div>
              </div>

              <nav aria-label="Menú lateral" className="py-2 flex flex-col">
                {drawerLinks.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onPointerDown={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
                    onMouseEnter={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
                    onTouchStart={() => RoutePrefetchService.prefetchRouteData(queryClient, to)}
                    onClick={requestClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-4 py-3.5 text-sm border-l-2 transition-colors ${
                        isActive
                          ? 'border-brand-400 bg-brand-400/10 text-brand-400 font-bold'
                          : 'border-transparent text-dark-text hover:bg-dark-card/60 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <PixelNavIcon name={icon} active={isActive} size={22} />
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="p-3 border-t border-dark-border pb-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))]">
              <button
                type="button"
                onClick={() => {
                  finishClose();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-muted hover:text-red-400 hover:bg-dark-card/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </dialog>
  );
};
