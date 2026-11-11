export interface TouchPoint {
  clientX: number;
  clientY: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function clampScale(value: number): number {
  return Math.min(6, Math.max(0.5, Number(value.toFixed(2))));
}

export function getTouchDistance(t1: TouchPoint, t2: TouchPoint): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

export function getTouchMidpoint(t1: TouchPoint, t2: TouchPoint): Point2D {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

export function computePinchPosition(
  rect: DOMRect | undefined,
  prevScale: number,
  nextScale: number,
  prevPos: Point2D,
  prevMid: Point2D,
  mid: Point2D
): Point2D {
  if (!rect || rect.width === 0 || rect.height === 0 || prevScale <= 0) {
    return { x: prevPos.x + (mid.x - prevMid.x), y: prevPos.y + (mid.y - prevMid.y) };
  }
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const ratio = nextScale / prevScale;
  return {
    x: (mid.x - cx) - ratio * (prevMid.x - cx - prevPos.x),
    y: (mid.y - cy) - ratio * (prevMid.y - cy - prevPos.y),
  };
}

