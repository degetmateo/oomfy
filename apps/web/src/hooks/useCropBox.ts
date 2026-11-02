import { useState, useRef, useCallback } from 'react';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleType = 'inside' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface UseCropBoxOptions {
  bounds: { width: number; height: number };
  aspectRatio: number | 'free';
}

export function useCropBox({ bounds, aspectRatio }: UseCropBoxOptions) {
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 200, height: 200 });
  const activeHandleRef = useRef<HandleType | null>(null);
  const startPosRef = useRef<{ clientX: number; clientY: number; startCrop: CropRect }>({
    clientX: 0,
    clientY: 0,
    startCrop: { x: 0, y: 0, width: 200, height: 200 },
  });

  const selectAll = useCallback(() => {
    if (bounds.width <= 0 || bounds.height <= 0) return;
    if (aspectRatio === 'free') {
      setCrop({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    } else {
      let w = bounds.width;
      let h = Math.round(w / aspectRatio);
      if (h > bounds.height) {
        h = bounds.height;
        w = Math.round(h * aspectRatio);
      }
      setCrop({
        x: Math.round((bounds.width - w) / 2),
        y: Math.round((bounds.height - h) / 2),
        width: w,
        height: h,
      });
    }
  }, [bounds, aspectRatio]);

  const onDragStart = (handle: HandleType, clientX: number, clientY: number) => {
    activeHandleRef.current = handle;
    startPosRef.current = { clientX, clientY, startCrop: { ...crop } };
  };

  const onDragMove = (clientX: number, clientY: number) => {
    const handle = activeHandleRef.current;
    if (!handle) return;

    const dx = clientX - startPosRef.current.clientX;
    const dy = clientY - startPosRef.current.clientY;
    const { startCrop } = startPosRef.current;

    if (handle === 'inside') {
      const maxX = bounds.width - startCrop.width;
      const maxY = bounds.height - startCrop.height;
      setCrop({
        ...startCrop,
        x: Math.max(0, Math.min(maxX, startCrop.x + dx)),
        y: Math.max(0, Math.min(maxY, startCrop.y + dy)),
      });
      return;
    }

    let newX = startCrop.x;
    let newY = startCrop.y;
    let newW = startCrop.width;
    let newH = startCrop.height;

    if (handle.includes('e')) newW = Math.max(40, startCrop.width + dx);
    if (handle.includes('s')) newH = Math.max(40, startCrop.height + dy);
    if (handle.includes('w')) {
      const clampedDx = Math.min(dx, startCrop.width - 40);
      newX = Math.max(0, startCrop.x + clampedDx);
      newW = startCrop.width - (newX - startCrop.x);
    }
    if (handle.includes('n')) {
      const clampedDy = Math.min(dy, startCrop.height - 40);
      newY = Math.max(0, startCrop.y + clampedDy);
      newH = startCrop.height - (newY - startCrop.y);
    }

    if (aspectRatio !== 'free') {
      if (handle === 'e' || handle === 'w' || handle.includes('e')) {
        newH = Math.round(newW / aspectRatio);
      } else {
        newW = Math.round(newH * aspectRatio);
      }
    }

    if (newX + newW > bounds.width) newW = bounds.width - newX;
    if (newY + newH > bounds.height) newH = bounds.height - newY;

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.max(40, Math.round(newW)),
      height: Math.max(40, Math.round(newH)),
    });
  };

  const onDragEnd = () => {
    activeHandleRef.current = null;
  };

  return { crop, setCrop, selectAll, onDragStart, onDragMove, onDragEnd };
}

