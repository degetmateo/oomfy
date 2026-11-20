import React from 'react';
import { clampScale, getTouchDistance, getTouchMidpoint, computePinchPosition, Point2D } from './touchPinchMath.js';

export interface PinchState {
  startDist: number;
  startScale: number;
  lastMid: Point2D;
}

export function handleViewerTouchStart(
  e: React.TouchEvent,
  scaleRef: React.MutableRefObject<number>,
  posRef: React.MutableRefObject<Point2D>,
  dragStart: React.MutableRefObject<Point2D>,
  downClient: React.MutableRefObject<Point2D>,
  didDrag: React.MutableRefObject<boolean>,
  pinchRef: React.MutableRefObject<PinchState | null>,
  setDragging: (v: boolean) => void
): void {
  e.stopPropagation();
  if (e.touches.length === 2) {
    didDrag.current = true;
    pinchRef.current = {
      startDist: getTouchDistance(e.touches[0], e.touches[1]),
      startScale: scaleRef.current,
      lastMid: getTouchMidpoint(e.touches[0], e.touches[1]),
    };
    setDragging(true);
  } else if (e.touches.length === 1) {
    didDrag.current = false;
    downClient.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    pinchRef.current = null;
    dragStart.current = { x: e.touches[0].clientX - posRef.current.x, y: e.touches[0].clientY - posRef.current.y };
    setDragging(true);
  }
}

export function handleViewerTouchMove(
  e: React.TouchEvent,
  stageEl: HTMLDivElement | null,
  isDragging: boolean,
  scaleRef: React.MutableRefObject<number>,
  posRef: React.MutableRefObject<Point2D>,
  dragStart: React.MutableRefObject<Point2D>,
  downClient: React.MutableRefObject<Point2D>,
  didDrag: React.MutableRefObject<boolean>,
  pinchRef: React.MutableRefObject<PinchState | null>,
  setScale: (s: number) => void,
  setPosition: (p: Point2D) => void
): void {
  e.stopPropagation();
  if (e.touches.length === 2) {
    didDrag.current = true;
    const dist = getTouchDistance(e.touches[0], e.touches[1]);
    const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
    if (!pinchRef.current || pinchRef.current.startDist <= 0) {
      pinchRef.current = { startDist: dist, startScale: scaleRef.current, lastMid: mid };
      return;
    }
    const nextScale = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
    const nextPos = computePinchPosition(stageEl?.getBoundingClientRect(), scaleRef.current, nextScale, posRef.current, pinchRef.current.lastMid, mid);
    pinchRef.current.lastMid = mid;
    scaleRef.current = nextScale;
    posRef.current = nextPos;
    setScale(nextScale);
    setPosition(nextPos);
  } else if (isDragging && e.touches.length === 1) {
    if (Math.hypot(e.touches[0].clientX - downClient.current.x, e.touches[0].clientY - downClient.current.y) > 4) {
      didDrag.current = true;
    }
    const next = { x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y };
    posRef.current = next;
    setPosition(next);
  }
}
