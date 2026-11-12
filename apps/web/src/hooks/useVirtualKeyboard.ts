import { useEffect } from 'react';

export function useVirtualKeyboard(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 768px)').matches
        : true;
    if (!isMobile) return;

    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) {
        if (blurTimer) clearTimeout(blurTimer);
        document.body.classList.add('keyboard-open');
      }
    };

    const handleFocusOut = () => {
      blurTimer = setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const stillInput =
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable);
        if (!stillInput) {
          document.body.classList.remove('keyboard-open');
        }
      }, 100);
    };

    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      if (!viewport) return;
      const heightDiff = window.innerHeight - viewport.height;
      if (heightDiff > 140) {
        document.body.classList.add('keyboard-open');
      } else if (!document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        document.body.classList.remove('keyboard-open');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    viewport?.addEventListener('resize', handleViewportResize);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      viewport?.removeEventListener('resize', handleViewportResize);
      document.body.classList.remove('keyboard-open');
    };
  }, []);
}
