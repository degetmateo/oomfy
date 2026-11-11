import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageViewerModal } from '../src/components/common/ImageViewerModal.js';

describe('ImageViewerModal Gestures (Mobile Pinch Zoom & PC Drag Release)', () => {
  it('supports two-finger pinch zoom-in and zoom-out on mobile touch devices', () => {
    render(<ImageViewerModal imageUrl="https://example.com/photo.gif" onClose={vi.fn()} />);
    const img = screen.getByAltText('Vista ampliada') as HTMLImageElement;
    const stage = img.parentElement!;

    fireEvent.touchStart(stage, {
      touches: [{ clientX: 100, clientY: 200 }, { clientX: 200, clientY: 200 }],
    });
    fireEvent.touchMove(stage, {
      touches: [{ clientX: 50, clientY: 200 }, { clientX: 250, clientY: 200 }],
    });
    expect(screen.getByText('200%')).toBeInTheDocument();
    expect(img.style.transform).toContain('scale(2)');

    fireEvent.touchMove(stage, {
      touches: [{ clientX: 100, clientY: 200 }, { clientX: 200, clientY: 200 }],
    });
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.touchMove(stage, {
      touches: [{ clientX: 125, clientY: 200 }, { clientX: 175, clientY: 200 }],
    });
    expect(screen.getByText('50%')).toBeInTheDocument();

    fireEvent.touchEnd(stage, { touches: [{ clientX: 125, clientY: 200 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 145, clientY: 210 }] });
    expect(img.style.transform).toContain('translate(20px, 10px)');
    fireEvent.touchEnd(stage, { touches: [] });
  });

  it('releases PC drag cleanly upon mouseUp, right-click guard, and unpressed mouseMove', () => {
    render(<ImageViewerModal imageUrl="https://example.com/photo.png" onClose={vi.fn()} />);
    const img = screen.getByAltText('Vista ampliada') as HTMLImageElement;
    const stage = img.parentElement!;

    fireEvent.mouseDown(stage, { button: 2, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 60, clientY: 60 });
    expect(img.style.transform).toContain('translate(0px, 0px)');

    fireEvent.mouseDown(stage, { button: 0, buttons: 1, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { buttons: 1, clientX: 130, clientY: 140 });
    expect(img.style.transform).toContain('translate(30px, 40px)');

    fireEvent.mouseUp(stage);
    fireEvent.mouseMove(window, { clientX: 300, clientY: 300 });
    expect(img.style.transform).toContain('translate(30px, 40px)');

    fireEvent.mouseDown(stage, { button: 0, buttons: 1, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { buttons: 0, clientX: 250, clientY: 250 });
    expect(img.style.transform).toContain('translate(30px, 40px)');
  });
});

