import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clampScale, getTouchDistance, getTouchMidpoint, computePinchPosition, Point2D } from '../utils/touchPinchMath.js';

export function useImageViewerZoom(imageUrl: string | null, onClose: () => void) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Point2D>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const scaleRef = useRef(1), posRef = useRef<Point2D>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false), sawButtonsRef = useRef(false);
  const dragStart = useRef<Point2D>({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number; lastMid: Point2D } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false; sawButtonsRef.current = false; pinchRef.current = null;
    setIsDragging(false);
  }, []);
  useEffect(() => {
    scaleRef.current = 1; posRef.current = { x: 0, y: 0 };
    setScale(1); setPosition({ x: 0, y: 0 }); stopDragging();
  }, [imageUrl, stopDragging]);
  useEffect(() => {
    if (!imageUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (sawButtonsRef.current && (e.buttons & 1) === 0) { stopDragging(); return; }
      const next = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
      posRef.current = next; setPosition(next);
    };
    const stageEl = stageRef.current;
    const preventNativePinch = (e: Event) => { if (!('touches' in e) || (e as TouchEvent).touches.length >= 2) e.preventDefault(); };
    stageEl?.addEventListener('touchmove', preventNativePinch, { passive: false });
    stageEl?.addEventListener('gesturestart', preventNativePinch, { passive: false });
    window.addEventListener('keydown', onKey); window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stopDragging, true); window.addEventListener('pointerup', stopDragging, true);
    window.addEventListener('blur', stopDragging); window.addEventListener('contextmenu', stopDragging, true);
    return () => {
      stageEl?.removeEventListener('touchmove', preventNativePinch); stageEl?.removeEventListener('gesturestart', preventNativePinch);
      window.removeEventListener('keydown', onKey); window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stopDragging, true); window.removeEventListener('pointerup', stopDragging, true);
      window.removeEventListener('blur', stopDragging); window.removeEventListener('contextmenu', stopDragging, true);
    };
  }, [imageUrl, onClose, stopDragging]);
  const handleZoom = useCallback((delta: number) => {
    const next = clampScale(scaleRef.current + delta); scaleRef.current = next; setScale(next);
  }, []);
  const resetZoom = useCallback(() => {
    scaleRef.current = 1; posRef.current = { x: 0, y: 0 }; setScale(1); setPosition({ x: 0, y: 0 });
  }, []);
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); e.stopPropagation(); handleZoom(e.deltaY < 0 ? 0.25 : -0.25); };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    sawButtonsRef.current = (e.buttons & 1) === 1; isDraggingRef.current = true; setIsDragging(true);
    dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: getTouchDistance(e.touches[0], e.touches[1]), startScale: scaleRef.current, lastMid: getTouchMidpoint(e.touches[0], e.touches[1]) };
      isDraggingRef.current = true; setIsDragging(true);
    } else if (e.touches.length === 1) {
      pinchRef.current = null; isDraggingRef.current = true; setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX - posRef.current.x, y: e.touches[0].clientY - posRef.current.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]), mid = getTouchMidpoint(e.touches[0], e.touches[1]);
      if (!pinchRef.current || pinchRef.current.startDist <= 0) {
        pinchRef.current = { startDist: dist, startScale: scaleRef.current, lastMid: mid }; return;
      }
      const nextScale = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
      const nextPos = computePinchPosition(stageRef.current?.getBoundingClientRect(), scaleRef.current, nextScale, posRef.current, pinchRef.current.lastMid, mid);
      pinchRef.current.lastMid = mid; scaleRef.current = nextScale; posRef.current = nextPos;
      setScale(nextScale); setPosition(nextPos);
    } else if (isDraggingRef.current && e.touches.length === 1) {
      const next = { x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y };
      posRef.current = next; setPosition(next);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      pinchRef.current = null; isDraggingRef.current = true; setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX - posRef.current.x, y: e.touches[0].clientY - posRef.current.y };
    } else if (e.touches.length < 2) stopDragging();
  };

  return { scale, position, isDragging, stageRef, handleZoom, resetZoom, handleWheel, handleMouseDown, stopDragging, handleTouchStart, handleTouchMove, handleTouchEnd };
}
