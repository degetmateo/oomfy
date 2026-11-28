import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh.js';

function dispatchTouch(type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', x = 0, y = 0) {
  const evt = new Event(type, { cancelable: true }) as unknown as TouchEvent;
  Object.defineProperty(evt, 'touches', {
    value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }],
  });
  window.dispatchEvent(evt);
  return evt;
}

describe('usePullToRefresh', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('triggers onRefresh on the very first downward swipe without losing touch tracking', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 50, maxPull: 100 }));

    const initialTouchMoveRegistrations = addSpy.mock.calls.filter(([name]) => name === 'touchmove').length;

    act(() => {
      dispatchTouch('touchstart', 100, 20);
      dispatchTouch('touchmove', 100, 60);
      dispatchTouch('touchmove', 100, 150);
    });

    expect(result.current.pullDistance).toBeGreaterThanOrEqual(50);
    expect(result.current.isReadyToRefresh).toBe(true);
    // Listeners must NOT re-register mid-gesture when pullDistance updates
    expect(addSpy.mock.calls.filter(([name]) => name === 'touchmove').length).toBe(initialTouchMoveRegistrations);

    await act(async () => {
      dispatchTouch('touchend');
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
    addSpy.mockRestore();
  });

  it('ignores horizontal swipes so tab/carousel gestures do not pull-to-refresh', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    act(() => {
      dispatchTouch('touchstart', 50, 100);
      dispatchTouch('touchmove', 120, 110);
      dispatchTouch('touchmove', 150, 180);
      dispatchTouch('touchend');
    });

    expect(result.current.pullDistance).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('resets active pull state cleanly on touchcancel and when disabled becomes true', () => {
    const onRefresh = vi.fn();
    const { result, rerender } = renderHook(
      ({ disabled }: { disabled: boolean }) => usePullToRefresh({ onRefresh, disabled }),
      { initialProps: { disabled: false } }
    );

    act(() => {
      dispatchTouch('touchstart', 50, 10);
      dispatchTouch('touchmove', 50, 80);
    });
    expect(result.current.pullDistance).toBeGreaterThan(0);

    act(() => {
      dispatchTouch('touchcancel');
    });
    expect(result.current.pullDistance).toBe(0);

    act(() => {
      dispatchTouch('touchstart', 50, 10);
      dispatchTouch('touchmove', 50, 80);
    });
    expect(result.current.pullDistance).toBeGreaterThan(0);

    rerender({ disabled: true });
    expect(result.current.pullDistance).toBe(0);
  });
});
