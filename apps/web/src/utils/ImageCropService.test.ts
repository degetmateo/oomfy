import { describe, it, expect } from 'vitest';
import { ImageCropService } from './ImageCropService.js';

describe('ImageCropService', () => {
  it('calculates initial scale to cover the crop box', () => {
    // Landscape image into square box
    const scale = ImageCropService.calculateInitialScale(800, 400, 300, 300);
    // scaleX = 300/800 = 0.375, scaleY = 300/400 = 0.75 -> max is 0.75
    expect(scale).toBeCloseTo(0.75, 2);

    // Portrait image into landscape box
    const scale2 = ImageCropService.calculateInitialScale(300, 600, 300, 100);
    // scaleX = 300/300 = 1, scaleY = 100/600 = 0.166 -> max is 1
    expect(scale2).toBe(1);
  });
});

