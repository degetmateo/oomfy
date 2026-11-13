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

    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const heightDiff = Math.max(0, window.innerHeight - (viewport.height + (viewport.offsetTop || 0)));
      if (heightDiff > 80) {
        document.documentElement.style.setProperty('--keyboard-inset-bottom', `${heightDiff}px`);
        document.body.classList.add('keyboard-open');
      } else {
        document.documentElement.style.setProperty('--keyboard-inset-bottom', '0px');
        const active = document.activeElement as HTMLElement | null;
        const stillInput =
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable);
        if (!stillInput) {
          document.body.classList.remove('keyboard-open');
        }
      }
    };

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
        updateKeyboardInset();
        setTimeout(updateKeyboardInset, 100);
        setTimeout(updateKeyboardInset, 300);
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
          document.documentElement.style.setProperty('--keyboard-inset-bottom', '0px');
        }
      }, 100);
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateKeyboardInset);
    viewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('resize', updateKeyboardInset);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      viewport?.removeEventListener('resize', updateKeyboardInset);
      viewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('resize', updateKeyboardInset);
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-inset-bottom', '0px');
    };
  }, []);
}
