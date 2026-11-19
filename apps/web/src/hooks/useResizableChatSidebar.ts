import { useState, useCallback, useEffect, useRef } from 'react';
import { safeLocalGet, safeLocalSet } from '../utils/safeStorage.js';

const STORAGE_KEY = 'oomfy_chat_sidebar_width';
const MIN_WIDTH = 220;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

function clampWidth(value: number, maxAllowed = MAX_WIDTH): number {
  return Math.min(maxAllowed, Math.max(MIN_WIDTH, Math.round(value)));
}

export function useResizableChatSidebar(containerRef?: React.RefObject<HTMLDivElement | null>) {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = Number(safeLocalGet(STORAGE_KEY));
    return Number.isFinite(saved) && saved >= MIN_WIDTH ? clampWidth(saved) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const getMaxAllowed = useCallback(() => {
    const containerW = containerRef?.current?.clientWidth || 0;
    return containerW > 500 ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, containerW - 280)) : MAX_WIDTH;
  }, [containerRef]);

  const persistWidth = useCallback((next: number) => {
    setSidebarWidth(next);
    safeLocalSet(STORAGE_KEY, String(next));
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const maxAllowed = getMaxAllowed();
    setIsResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      persistWidth(clampWidth(startW + (ev.clientX - startX), maxAllowed));
    };
    const stop = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stop);
      cleanupRef.current = null;
    };
    cleanupRef.current = stop;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stop);
  }, [sidebarWidth, getMaxAllowed, persistWidth]);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 16 : -16;
    persistWidth(clampWidth(sidebarWidth + delta, getMaxAllowed()));
  }, [sidebarWidth, getMaxAllowed, persistWidth]);

  return { sidebarWidth, isResizing, startResizing, handleDividerKeyDown };
}
