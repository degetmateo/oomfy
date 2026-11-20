import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ImageViewerModal } from '../src/components/common/ImageViewerModal.js';

describe('ImageViewerModal Gestures, Close Outside & Wheel Zoom Lock', () => {
  it('supports two-finger pinch zoom-in and zoom-out on mobile touch devices', () => {
    render(<ImageViewerModal imageUrl="https://example.com/photo.gif" onClose={vi.fn()} />);
    const img = screen.getByAltText('Vista ampliada') as HTMLImageElement;
    const stage = img.parentElement!;

    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 200 }, { clientX: 200, clientY: 200 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 50, clientY: 200 }, { clientX: 250, clientY: 200 }] });
    expect(screen.getByText('200%')).toBeInTheDocument();
    expect(img.style.transform).toContain('scale(2)');

    fireEvent.touchMove(stage, { touches: [{ clientX: 125, clientY: 200 }, { clientX: 175, clientY: 200 }] });
    expect(screen.getByText('50%')).toBeInTheDocument();

    fireEvent.touchEnd(stage, { touches: [{ clientX: 125, clientY: 200 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 145, clientY: 210 }] });
    expect(img.style.transform).toContain('translate(20px, 10px)');
    fireEvent.touchEnd(stage, { touches: [] });
  });

  it('closes when clicking outside image, preserves drag on click-drag, and prevents wheel background scroll', () => {
    const onClose = vi.fn();
    render(<ImageViewerModal imageUrl="https://example.com/photo.png" onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const img = screen.getByAltText('Vista ampliada') as HTMLImageElement;
    const stage = img.parentElement!;

    // Dragging on stage must NOT trigger close on release click
    fireEvent.mouseDown(stage, { button: 0, buttons: 1, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { buttons: 1, clientX: 130, clientY: 140 });
    fireEvent.mouseUp(stage);
    fireEvent.click(stage);
    expect(img.style.transform).toContain('translate(30px, 40px)');
    expect(onClose).not.toHaveBeenCalled();

    // Clicking directly on image must NOT close
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();

    // Clicking empty area outside image DOES close
    fireEvent.mouseDown(stage, { button: 0, buttons: 1, clientX: 10, clientY: 10 });
    fireEvent.mouseUp(stage);
    fireEvent.click(stage);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Native wheel zoom prevents default background scrolling
    const wheelEvt = new WheelEvent('wheel', { deltaY: -120, cancelable: true, bubbles: true });
    let notCanceled = true;
    act(() => { notCanceled = dialog.dispatchEvent(wheelEvt); });
    expect(notCanceled).toBe(false);
    expect(wheelEvt.defaultPrevented).toBe(true);
    expect(screen.getByText('125%')).toBeInTheDocument();
  });
});
