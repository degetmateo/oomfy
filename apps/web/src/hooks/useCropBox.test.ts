import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCropBox } from './useCropBox.js';

describe('useCropBox Hook', () => {
  it('initializes crop box and selects all when requested', () => {
    const { result } = renderHook(() =>
      useCropBox({
        bounds: { width: 400, height: 300 },
        aspectRatio: 'free',
      })
    );

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.crop).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  it('moves crop box when dragging inside handle', () => {
    const { result } = renderHook(() =>
      useCropBox({
        bounds: { width: 500, height: 400 },
        aspectRatio: 'free',
      })
    );

    act(() => {
      result.current.setCrop({ x: 50, y: 50, width: 100, height: 100 });
    });

    act(() => {
      result.current.onDragStart('inside', 50, 50);
      result.current.onDragMove(80, 90); // dx = 30, dy = 40
      result.current.onDragEnd();
    });

    expect(result.current.crop.x).toBe(80);
    expect(result.current.crop.y).toBe(90);
    expect(result.current.crop.width).toBe(100);
    expect(result.current.crop.height).toBe(100);
  });

  it('resizes crop box from bottom-right handle (se)', () => {
    const { result } = renderHook(() =>
      useCropBox({
        bounds: { width: 500, height: 400 },
        aspectRatio: 'free',
      })
    );

    act(() => {
      result.current.setCrop({ x: 10, y: 10, width: 100, height: 100 });
    });

    act(() => {
      result.current.onDragStart('se', 110, 110);
      result.current.onDragMove(160, 180); // dx = 50, dy = 70
      result.current.onDragEnd();
    });

    expect(result.current.crop.width).toBe(150);
    expect(result.current.crop.height).toBe(170);
  });
});

