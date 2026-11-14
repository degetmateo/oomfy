import { CropAreaRect } from './ImageCropService.js';

/**
 * Calcula el área de recorte inicial centrada según las dimensiones renderizadas y la relación de aspecto.
 */
export function computeInitialCropRect(width: number, height: number, aspect: number | 'free'): CropAreaRect {
  if (aspect === 'free') {
    return { x: 0, y: 0, width, height };
  }
  let initW = Math.round(width * 0.85);
  let initH = Math.round(initW / aspect);
  if (initH > height) {
    initH = Math.round(height * 0.85);
    initW = Math.round(initH * aspect);
  }
  return {
    x: Math.round((width - initW) / 2),
    y: Math.round((height - initH) / 2),
    width: initW,
    height: initH,
  };
}
