import React, { useRef } from 'react';

/**
 * Evita navegar al detalle de una tarjeta cuando el usuario arrastra para seleccionar texto
 * o interactúa con controles, enlaces o multimedia internos.
 */
export function useCardClickGuard(onNavigate: () => void) {
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };

  const onClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const blocked = target?.closest('a, button, input, textarea, [data-no-card-nav="true"]');
    if (blocked && blocked !== e.currentTarget) return;

    const selectedText = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
    if (selectedText && selectedText.length > 0) return;

    if (downPos.current) {
      const dx = Math.abs(e.clientX - downPos.current.x);
      const dy = Math.abs(e.clientY - downPos.current.y);
      downPos.current = null;
      if (dx > 4 || dy > 4) return;
    }

    onNavigate();
  };

  return { onMouseDown, onClick };
}
