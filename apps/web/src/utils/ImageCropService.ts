export interface CropAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ImageCropService {
  public static async cropFromRect(
    image: HTMLImageElement,
    renderedSize: { width: number; height: number },
    crop: CropAreaRect,
    originalFile: File
  ): Promise<File> {
    const scaleX = image.naturalWidth / renderedSize.width;
    const scaleY = image.naturalHeight / renderedSize.height;

    const srcX = Math.max(0, Math.round(crop.x * scaleX));
    const srcY = Math.max(0, Math.round(crop.y * scaleY));
    const srcW = Math.min(image.naturalWidth - srcX, Math.round(crop.width * scaleX));
    const srcH = Math.min(image.naturalHeight - srcY, Math.round(crop.height * scaleY));

    // Limit maximum dimension to 1600 for performance & memory
    const maxDim = 1600;
    let outW = srcW;
    let outH = srcH;
    if (outW > maxDim || outH > maxDim) {
      if (outW >= outH) {
        outH = Math.round((outH * maxDim) / outW);
        outW = maxDim;
      } else {
        outW = Math.round((outW * maxDim) / outH);
        outH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D de canvas.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    return new Promise<File>((resolve, reject) => {
      const mimeType = originalFile.type.startsWith('image/png') ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al generar la imagen recortada.'));
            return;
          }
          resolve(new File([blob], originalFile.name, { type: mimeType, lastModified: Date.now() }));
        },
        mimeType,
        0.92
      );
    });
  }

  public static calculateInitialScale(
    imgWidth: number,
    imgHeight: number,
    boxWidth: number,
    boxHeight: number
  ): number {
    const scaleX = boxWidth / imgWidth;
    const scaleY = boxHeight / imgHeight;
    return Math.max(scaleX, scaleY);
  }
}
