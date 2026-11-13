import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useTabSwipe } from '../src/hooks/useTabSwipe.js';
import { ProfileTabs, ProfileTab } from '../src/components/profile/ProfileTabs.js';

describe('Tab Swipe Gesture Hook and Component', () => {
  const tabs = ['posts', 'replies', 'likes'] as const;

  it('switches to the next tab on swipe left (deltaX < -threshold)', () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useTabSwipe({
        tabs,
        activeTab: 'posts',
        onTabChange,
      })
    );

    act(() => {
      result.current.touchHandlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 200 } as any],
        target: document.createElement('div'),
      } as any);
      result.current.touchHandlers.onTouchEnd({
        changedTouches: [{ clientX: 130, clientY: 205 } as any],
      } as any);
    });

    expect(onTabChange).toHaveBeenCalledWith('replies');
  });

  it('switches to the previous tab on swipe right (deltaX > threshold)', () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useTabSwipe({
        tabs,
        activeTab: 'replies',
        onTabChange,
      })
    );

    act(() => {
      result.current.touchHandlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 200 } as any],
        target: document.createElement('div'),
      } as any);
      result.current.touchHandlers.onTouchEnd({
        changedTouches: [{ clientX: 170, clientY: 195 } as any],
      } as any);
    });

    expect(onTabChange).toHaveBeenCalledWith('posts');
  });

  it('does nothing when swiping left on the last tab', () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useTabSwipe({
        tabs,
        activeTab: 'likes',
        onTabChange,
      })
    );

    act(() => {
      result.current.touchHandlers.onTouchStart({
        touches: [{ clientX: 250, clientY: 200 } as any],
        target: document.createElement('div'),
      } as any);
      result.current.touchHandlers.onTouchEnd({
        changedTouches: [{ clientX: 180, clientY: 200 } as any],
      } as any);
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('does nothing when swiping right on the first tab', () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useTabSwipe({
        tabs,
        activeTab: 'posts',
        onTabChange,
      })
    );

    act(() => {
      result.current.touchHandlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 200 } as any],
        target: document.createElement('div'),
      } as any);
      result.current.touchHandlers.onTouchEnd({
        changedTouches: [{ clientX: 180, clientY: 200 } as any],
      } as any);
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('ignores vertical scrolling movement', () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useTabSwipe({
        tabs,
        activeTab: 'posts',
        onTabChange,
      })
    );

    act(() => {
      result.current.touchHandlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 200 } as any],
        target: document.createElement('div'),
      } as any);
      result.current.touchHandlers.onTouchEnd({
        changedTouches: [{ clientX: 190, clientY: 100 } as any],
      } as any);
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('renders ProfileTabs and switches tabs on click', () => {
    const TestComponent = () => {
      const [tab, setTab] = useState<ProfileTab>('posts');
      return (
        <div>
          <ProfileTabs activeTab={tab} onTabChange={setTab} />
          <div data-testid="current">{tab}</div>
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByTestId('current')).toHaveTextContent('posts');

    fireEvent.click(screen.getByText('Respuestas'));
    expect(screen.getByTestId('current')).toHaveTextContent('replies');

    fireEvent.click(screen.getByText('Me gusta'));
    expect(screen.getByTestId('current')).toHaveTextContent('likes');
  });
});

