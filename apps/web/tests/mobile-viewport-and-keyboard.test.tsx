import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useVirtualKeyboard } from '../src/hooks/useVirtualKeyboard.js';
import { MobileFloatingButton } from '../src/components/layout/MobileFloatingButton.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Mobile Viewport & Keyboard Layout Adaptation', () => {
  beforeEach(() => {
    document.body.className = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.className = '';
  });

  it('adds and removes keyboard-open class on focusin and focusout when on mobile', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as any);
    renderHook(() => useVirtualKeyboard());

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(document.body.classList.contains('keyboard-open')).toBe(true);

    vi.useFakeTimers();
    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      vi.advanceTimersByTime(150);
    });
    expect(document.body.classList.contains('keyboard-open')).toBe(false);
    vi.useRealTimers();

    input.remove();
  });

  it('renders MobileFloatingButton with mobile-keyboard-hide class', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'alice', role: 'member', name: 'Alice' } as any,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <MobileFloatingButton />
      </MemoryRouter>
    );

    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.classList.contains('mobile-keyboard-hide')).toBe(true);
  });
});

