import { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react';
import { useCloseOnViewInactive } from '../contexts/ViewActivityContext.js';

const DEFAULT_MENU_WIDTH = 192;
const VIEWPORT_MARGIN = 8;

function hasPopoverSupport(): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    typeof (HTMLElement.prototype as { showPopover?: unknown }).showPopover === 'function' &&
    typeof (HTMLElement.prototype as { hidePopover?: unknown }).hidePopover === 'function'
  );
}

function hasAnchorSupport(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('position-area', 'block-end');
}

export function usePopoverMenu(options?: { width?: number }) {
  const menuWidth = options?.width ?? DEFAULT_MENU_WIDTH;
  const safeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const menuId = `pub-menu-${safeId}`;
  const anchorName = `--pub-menu-${safeId}`;
  const supportsPopover = hasPopoverSupport();
  const supportsAnchor = hasAnchorSupport();

  const [isOpen, setIsOpen] = useState(false);
  const [isDeferred, setIsDeferred] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef(false);

  const useJsPos = !supportsPopover || !supportsAnchor || isDeferred;

  const updatePosition = useCallback((): boolean => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return true;
    const deferred = Boolean(trigger.closest('.feed-card-deferred'));
    if (deferred !== isDeferred) setIsDeferred(deferred);
    if (supportsPopover && supportsAnchor && !deferred) return true;
    const rect = trigger.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
    const height = menuRef.current?.offsetHeight || 190;
    const openAbove = rect.bottom + 4 + height > window.innerHeight - VIEWPORT_MARGIN && rect.top - 4 - height >= VIEWPORT_MARGIN;
    const top = openAbove
      ? Math.max(VIEWPORT_MARGIN, rect.top - 4 - height)
      : Math.min(window.innerHeight - height - VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, rect.bottom + 4));
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - VIEWPORT_MARGIN));
    setCoords({ top, left });
    return true;
  }, [isDeferred, menuWidth, supportsAnchor, supportsPopover]);

  const closeMenu = useCallback((restoreFocus = false) => {
    restoreFocusRef.current = restoreFocus;
    const el = menuRef.current as (HTMLDivElement & { hidePopover?: () => void }) | null;
    if (supportsPopover && el?.isConnected) {
      try { if (el.matches(':popover-open')) el.hidePopover?.(); } catch { /* ignore invalid state */ }
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, [supportsPopover]);

  const toggleFallback = useCallback(() => {
    if (isOpen) { closeMenu(false); return; }
    updatePosition();
    restoreFocusRef.current = true;
    setIsOpen(true);
  }, [isOpen, closeMenu, updatePosition]);

  useCloseOnViewInactive(isOpen, () => closeMenu(false));

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    const deferred = Boolean(trigger?.closest('.feed-card-deferred'));
    if (deferred !== isDeferred) setIsDeferred(deferred);
    const jsMode = !supportsPopover || !supportsAnchor || deferred;
    if (trigger) {
      if (!jsMode) trigger.style.setProperty('anchor-name', anchorName);
      else trigger.style.removeProperty('anchor-name');
    }
    if (menu) {
      if (!jsMode) menu.style.setProperty('position-anchor', anchorName);
      else menu.style.removeProperty('position-anchor');
    }
  }, [anchorName, isDeferred, isOpen, supportsAnchor, supportsPopover]);

  useEffect(() => {
    const el = menuRef.current;
    if (!supportsPopover || !el) return;
    const onToggle = (e: Event) => {
      const next = (e as { newState?: string }).newState;
      const open = next ? next === 'open' : Boolean(el.matches?.(':popover-open'));
      setIsOpen(open);
      if (open) {
        restoreFocusRef.current = true;
        updatePosition();
        requestAnimationFrame(() => (el.querySelector('button') as HTMLElement | null)?.focus());
      } else if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        triggerRef.current?.focus();
      }
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [supportsPopover, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const onScrollOrResize = () => { if (useJsPos && !updatePosition()) closeMenu(false); };
    const onPointerDown = (e: Event) => {
      if (supportsPopover) return;
      const t = e.target as Node | null;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) closeMenu(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const container = menuRef.current;
      if (!container) return;
      if (e.key === 'Escape') {
        if (!supportsPopover) { e.stopPropagation(); closeMenu(true); }
        return;
      }
      if (e.key === 'Tab') {
        closeMenu(false);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const items = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (items.length === 0) return;
      const currentIdx = items.indexOf(document.activeElement as HTMLButtonElement);
      const nextIdx =
        e.key === 'Home' ? 0
          : e.key === 'End' ? items.length - 1
            : (currentIdx + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
      e.preventDefault();
      e.stopPropagation();
      items[nextIdx]?.focus({ preventScroll: true });
    };
    if (useJsPos) {
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
    }
    if (!supportsPopover) {
      document.addEventListener('pointerdown', onPointerDown, true);
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isOpen, useJsPos, supportsPopover, updatePosition, closeMenu]);

  return { menuId, triggerRef, menuRef, isOpen, supportsPopover, useJsPos, coords, closeMenu, toggleFallback };
}
